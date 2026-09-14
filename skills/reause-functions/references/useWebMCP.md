---
category: Browser
---

# useWebMCP

Register a [WebMCP](https://github.com/webmachinelearning/webmcp) tool and tie its lifecycle to the current component.

WebMCP lets a page expose JavaScript functions as "tools" that an AI agent (browser-built-in, iframe-hosted, or extension) can discover and call, instead of scraping the DOM, the accessibility tree, or screenshots. `useWebMCP` wraps the imperative, `AbortSignal`-based registration API in a declarative hook: the tool is registered when the component mounts and **unregistered automatically when it unmounts**, so the set of tools an agent sees stays in lockstep with what is actually on screen.

::: warning Experimental
The WebMCP spec is `🧪` experimental and exposes the imperative API on `document.modelContext` (`registerTool` + an `AbortSignal` for unregistration). This hook feature-detects and degrades to a no-op everywhere the API is absent — check `isSupported` before relying on it.
:::

## Usage

```tsx
import { useWebMCP } from '@reause/core'
import { useState } from 'react'

const [todos, setTodos] = useState<string[]>([])

const { isSupported, isRegistered, error } = useWebMCP({
  name: 'add-todo',
  description: 'Add a new item to the user\'s active todo list',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The text content of the todo item' },
    },
    required: ['text'],
  },
  async execute({ text }: { text: string }) {
    setTodos(prev => [...prev, text])
    return `Added todo item: "${text}" successfully.`
  },
})
```

The raw imperative API this wraps looks like:

```ts
const controller = new AbortController()

document.modelContext.registerTool({
  name: 'add-todo',
  description: 'Add a new item to the user\'s active todo list',
  inputSchema: { /* … */ },
  async execute({ text }) {
    return { content: [{ type: 'text', text: `Added todo item: "${text}".` }] }
  },
}, { signal: controller.signal })

// Unregister later:
controller.abort()
```

## Result normalization

Whatever `execute` returns is normalized into a valid MCP tool result:

- a **string** → `{ content: [{ type: 'text', text }] }`
- **`undefined`/`null`** (no return) → `{ content: [] }` (success, no payload)
- a value that is **already** `{ content: [...] }` → passed through untouched
- a **thrown value** — `Error` or not (`throw 'not signed in'`, `throw { code: 403 }`) → `{ content: [{ type: 'text', text }], isError: true }`, after `onError`. A failure must never read as success to the agent.
- a **returned `Error`** → treated exactly like a throw: `onError` fires, then an `isError` result
- anything else (object/array/number) → JSON-serialized into a text block

## Reactive & conditional registration

`name`, `description`, `inputSchema`, `annotations` and `enabled` are plain React values — upstream takes Vue refs for the same fields. Pass a value derived from state and the tool will be re-registered when that value changes; toggling `enabled` unregisters and re-registers it. `execute`, `formatOutput` and `onError` are read live at call time, so a changing closure never churns the registration.

```tsx
import { useWebMCP } from '@reause/core'
import { useState } from 'react'

const [signedIn, setSignedIn] = useState(false)

useWebMCP({
  name: 'checkout',
  description: 'Complete the checkout for the current cart',
  enabled: signedIn, // only exposed to agents while signed in
  annotations: { readOnlyHint: false },
  execute() {
    // …
  },
  onError(err) {
    console.error('checkout tool failed', err)
  },
})
```

## Registering multiple tools

Call `useWebMCP` once per tool to register several — each call manages its own registration lifecycle.

```tsx
import { useWebMCP } from '@reause/core'

useWebMCP({
  name: 'add-todo',
  description: 'Add a new item to the todo list',
  execute({ text }) {
    // …
  },
})

useWebMCP({
  name: 'clear-todos',
  description: 'Remove every item from the todo list',
  annotations: { readOnlyHint: false },
  execute() {
    // …
  },
})
```

## References

- [WebMCP explainer & spec (webmachinelearning/webmcp)](https://github.com/webmachinelearning/webmcp)
- [GoogleChromeLabs/use-webmcp-tool](https://github.com/GoogleChromeLabs/use-webmcp-tool) — the React hook this composable is modeled after

Map from (`source/vueuse/packages/core/useWebMCP/`):

- `index.ts` — upstream implementation
- `index.test.ts` — upstream tests, mirrored by the co-located `index.test.tsx`

## Type Declarations

```ts
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
  registerTool: (
    tool: WebMCPToolDescriptor,
    options?: {
      signal?: AbortSignal
    },
  ) => void
}
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
/**
 * Map from @vueuse/core `useWebMCP`
 * (`source/vueuse/packages/core/useWebMCP/`).
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
export declare function useWebMCP<Args = Record<string, any>, Result = unknown>(
  options: UseWebMCPOptions<Args, Result>,
): UseWebMCPReturn
```
