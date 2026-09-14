import { useCallback, useEffect, useRef, useState } from 'react'
import { useSupported } from '../useSupported'

/**
 * A single block of a WebMCP tool result.
 *
 * @see https://github.com/webmachinelearning/webmcp
 */
export interface WebMCPToolContent {
  type: string
  text?: string
  [key: string]: unknown
}

/**
 * The normalized result an agent receives after a tool runs.
 */
export interface WebMCPToolResponse {
  content: WebMCPToolContent[]
  isError?: boolean
}

/**
 * Hints an author can attach to a tool to shape how an agent uses it.
 */
export interface WebMCPToolAnnotations {
  /**
   * The tool does not mutate state and is safe to call speculatively.
   */
  readOnlyHint?: boolean
  /**
   * The tool may return content that should be treated as untrusted.
   */
  untrustedContentHint?: boolean
  [key: string]: unknown
}

/**
 * The imperative descriptor passed to `document.modelContext.registerTool`.
 */
export interface WebMCPToolDescriptor {
  name: string
  description: string
  inputSchema?: object
  annotations?: WebMCPToolAnnotations
  execute: (args: any) => Promise<WebMCPToolResponse> | WebMCPToolResponse
}

/**
 * The (experimental) imperative WebMCP API surface exposed on `document`.
 */
export interface ModelContext {
  registerTool: (tool: WebMCPToolDescriptor, options?: { signal?: AbortSignal }) => void
}

/**
 * The WebMCP API is experimental and not yet in the DOM lib, so narrow the `document` locally
 * rather than augmenting the global `Document` type (a `declare global` here would risk type
 * conflicts for downstream consumers once the DOM lib ships its own definition).
 */
type DocumentWithModelContext = Document & { modelContext?: ModelContext }

export interface UseWebMCPOptions<Args, Result> {
  /**
   * Tool identifier the agent uses to invoke this tool.
   */
  name: string
  /**
   * Natural-language description the agent reads to decide when to call it.
   */
  description: string
  /**
   * JSON Schema describing the tool arguments.
   */
  inputSchema?: object
  /**
   * Hints (`readOnlyHint`, `untrustedContentHint`, …) shaping agent behavior.
   */
  annotations?: WebMCPToolAnnotations
  /**
   * The function the agent calls. May be async. Its return value is normalized into a WebMCP tool
   * result, and any thrown/returned `Error` becomes an `isError` result.
   */
  execute: (args: Args) => Result | Promise<Result>
  /**
   * Register the tool only while this is `true`.
   *
   * @default true
   */
  enabled?: boolean
  /**
   * Shape the `execute` result before it is normalized into a tool response.
   */
  formatOutput?: (result: Result, args: Args) => unknown
  /**
   * Side effect invoked when `execute` (or `formatOutput`) throws/returns an error.
   */
  onError?: (error: unknown) => void
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   * Upstream composes this from the shared `ConfigurableDocument` option type.
   *
   * @default typeof document !== 'undefined' ? document : undefined
   */
  document?: Document
}

export interface UseWebMCPReturn {
  /**
   * If the experimental WebMCP API (`document.modelContext.registerTool`) is available.
   */
  isSupported: boolean
  /**
   * Whether the tool is currently registered with the browser.
   */
  isRegistered: boolean
  /**
   * Registration error, e.g. a `NotAllowedError` from a `tools` permissions policy.
   */
  error: Error | null
}

// Stringify for error reporting without ever throwing itself
// (JSON.stringify throws on circular references and BigInt).
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  }
  catch {
    return String(value)
  }
}

// Normalize whatever `execute` returns into an MCP tool result, so callers can
// return a plain string/object and still hand the agent a valid response.
function toToolResponse(value: unknown): WebMCPToolResponse {
  // Already a well-formed MCP tool result — pass it through untouched.
  if (value && typeof value === 'object' && Array.isArray((value as WebMCPToolResponse).content))
    return value as WebMCPToolResponse

  // `execute` returned nothing — report a successful, empty result.
  if (value === undefined || value === null)
    return { content: [] }

  // Strings map directly to a single text block.
  if (typeof value === 'string')
    return { content: [{ type: 'text', text: value }] }

  // Anything else (objects, arrays, numbers) is serialized to JSON text.
  // `safeStringify` so exotic values (circular refs / BigInt) can't turn a
  // successful result into an error.
  return { content: [{ type: 'text', text: safeStringify(value) }] }
}

// Every failure becomes an explicit `isError` result, whatever was thrown — a
// thrown string or plain object must not read as success to the agent.
function toErrorResponse(error: unknown): WebMCPToolResponse {
  const text = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : safeStringify(error)
  return { content: [{ type: 'text', text }], isError: true }
}

/**
 * Map from @vueuse/core `useWebMCP`
 * (`source/vueuse/packages/core/useWebMCP/`). Register a
 * [WebMCP](https://github.com/webmachinelearning/webmcp) tool and tie its lifecycle to the
 * component: the tool is registered on mount (and whenever a discoverable part — `name`,
 * `description`, `inputSchema`, `annotations` or `enabled` — changes) and unregistered
 * automatically on unmount, so the tools an agent sees stay in lockstep with what is on screen.
 * Call it multiple times to register multiple tools.
 *
 * The upstream return shape is mirrored 1:1 as a plain object: `isSupported`, `isRegistered` and
 * `error` are plain values.
 *
 * React divergences:
 * - `isSupported` is a plain boolean computed by `useSupported`, i.e. in a
 *   mount effect — it stays `false` during render and on the server, so no
 *   `document.modelContext` is touched while rendering. The registration
 *   effect tolerates `false` on its first pass and re-runs when the probe
 *   settles;
 * - `isRegistered`/`error` are plain `useState` values (upstream
 *   `shallowRef`s) — the return is an object, so they are read-only and
 *   intentionally exposed without setters (internal registration state);
 * - `name`, `description`, `inputSchema`, `annotations` and `enabled` are plain React values.
 * Because React has no reactive dependency tracking, the registration effect depends on those
 * values directly, so passing a value derived from state re-registers the tool when it changes. The
 * schema and annotations are serialized to stable strings first, so a content-equal inline object
 * literal does not churn the registration (upstream serializes them inside its `watch` getters for
 * the same reason);
 * - `execute`, `formatOutput` and `onError` are read live from a
 *   `{ current }` container (`live`) at call time (upstream reads
 *   `options.*` directly), so swapping those closures never re-registers the
 *   tool; the container is updated on every render rather than through
 *   `useRef`'s initializer;
 * - the custom `document` option overrides the global one and is resolved
 *   lazily inside the effects (`resolveDocument`), so the global `document` is
 *   never read during render;
 * - `register()` + `tryOnScopeDispose(cleanup)` collapse into a single
 *   `useEffect`: its cleanup aborts the `AbortController` (how WebMCP
 *   unregisters a tool), so it runs both on unmount and before every
 *   re-registration — upstream's `cleanup()` called at the top of `register()`;
 * - `doc!.modelContext!.registerTool` becomes an explicit callable check
 *   (upstream also feature-detects through `useSupported`);
 * - `DocumentWithModelContext` is declared locally; no `declare global`.
 *
 * @example
 * const { isSupported, isRegistered, error } = useWebMCP({
 *   name: 'add-todo',
 *   description: 'Add a new item to the user\'s active todo list',
 *   inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
 *   execute: ({ text }) => `Added todo item: "${text}" successfully.`,
 * })
 *
 * @see https://vueuse.org/useWebMCP
 * @see https://github.com/webmachinelearning/webmcp
 */
export function useWebMCP<Args = Record<string, any>, Result = unknown>(
  options: UseWebMCPOptions<Args, Result>,
): UseWebMCPReturn {
  const documentOption = options.document

  // Resolve the configurable document lazily, inside the effects below — the
  // global `document` and `document.modelContext` are never touched during
  // render (SSR safe). Kept in a `useCallback` so it can be part of the
  // registration effect's dependency array without re-running on every render.
  const resolveDocument = useCallback<() => DocumentWithModelContext | undefined>(
    () => (documentOption ?? (typeof document === 'undefined' ? undefined : document)) as DocumentWithModelContext | undefined,
    [documentOption],
  )

  // Require `registerTool` to be callable, not merely that `modelContext`
  // exists — a present-but-incomplete API should report unsupported rather
  // than surface a registration error. `useSupported` probes in a mount
  // effect, so this is `false` on the first pass and the effect below
  // re-registers once it flips.
  const isSupported = useSupported(() => typeof resolveDocument()?.modelContext?.registerTool === 'function')

  const [isRegistered, setIsRegistered] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const name = options.name
  const description = options.description
  const enabled = options.enabled ?? true

  // Everything read at registration time (`inputSchema`/`annotations`) and at
  // call time (`execute`/`formatOutput`/`onError`) lives in this live
  // container, refreshed on every render. Upstream reads `options.*` directly:
  // the schema/annotations are compared through their serialized keys below,
  // and the three callbacks are intentionally outside the dependency array so
  // a changing closure never forces a re-registration.
  const live = useRef<{
    inputSchema?: object
    annotations?: WebMCPToolAnnotations
    execute: (args: Args) => Result | Promise<Result>
    formatOutput?: (result: Result, args: Args) => unknown
    onError?: (error: unknown) => void
  }>({
    inputSchema: options.inputSchema,
    annotations: options.annotations,
    execute: options.execute,
    formatOutput: options.formatOutput,
    onError: options.onError,
  })

  live.current = {
    inputSchema: options.inputSchema,
    annotations: options.annotations,
    execute: options.execute,
    formatOutput: options.formatOutput,
    onError: options.onError,
  }

  // Only the parts an agent discovers trigger re-registration. The schema and
  // annotations are serialized so inline object literals don't churn every
  // change. `execute`/`formatOutput`/`onError` are read live at call time, so
  // a changing closure never forces a re-registration.
  const inputSchemaKey = live.current.inputSchema ? safeStringify(live.current.inputSchema) : ''
  const annotationsKey = live.current.annotations ? safeStringify(live.current.annotations) : ''

  useEffect(() => {
    // Upstream's `register()` clears the previous error before re-registering.
    setError(null)

    const modelContext = resolveDocument()?.modelContext

    if (!isSupported || !enabled || typeof modelContext?.registerTool !== 'function') {
      setIsRegistered(false)
      return
    }

    const controller = new AbortController()

    try {
      modelContext.registerTool(
        {
          name,
          description,
          inputSchema: live.current.inputSchema,
          annotations: live.current.annotations,
          async execute(args: Args) {
            try {
              const result = await live.current.execute(args)
              const shaped = live.current.formatOutput ? live.current.formatOutput(result, args) : result
              // A returned Error gets the same treatment as a thrown one:
              // `onError`, then an `isError` result.
              if (shaped instanceof Error)
                throw shaped
              return toToolResponse(shaped)
            }
            catch (err) {
              // `onError` is a side effect and must never break the tool
              // execution path — always return a WebMCPToolResponse.
              try {
                live.current.onError?.(err)
              }
              catch {
                // swallowed on purpose: a throwing `onError` must not turn a
                // normalized error result into an unhandled rejection
              }
              return toErrorResponse(err)
            }
          },
        },
        { signal: controller.signal },
      )
      setIsRegistered(true)
    }
    catch (err) {
      // e.g. NotAllowedError when the `tools` permissions policy is disabled.
      setError(err instanceof Error ? err : new Error(safeStringify(err)))
      setIsRegistered(false)
    }

    return () => {
      // Aborting the signal is how WebMCP unregisters a tool. This cleanup
      // runs on unmount and before every re-registration.
      controller.abort()
      setIsRegistered(false)
    }
  }, [annotationsKey, description, enabled, inputSchemaKey, isSupported, name, resolveDocument])

  return {
    isSupported,
    isRegistered,
    error,
  }
}
