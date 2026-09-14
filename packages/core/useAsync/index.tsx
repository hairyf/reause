import type { State } from '@reause/shared'
import { noop, useControllableState } from '@reause/shared'
import { useEffect, useRef } from 'react'

/**
 * Upstream re-exports `Fn` from `@vueuse/shared` types; `@reause/shared` does not export it, so it
 * is declared locally here (same pattern as `packages/shared/useIntervalFn/index.tsx`).
 */
type Fn = () => void

/**
 * Handle overlapping async evaluations.
 *
 * @param cancelCallback The provided callback is invoked when a re-evaluation of the computed value is triggered before the previous one finished
 */
export type UseAsyncOnCancel = (cancelCallback: Fn) => void

export interface UseAsyncOptions {
  /**
   * React dependency array driving re-evaluation (replaces upstream's automatic reactive-dep
   * tracking). Defaults to `[]` = evaluate once on mount.
   */
  deps?: unknown[]
  /** Called with `true` when an evaluation starts, `false` when it settles. Replaces upstream's `evaluating` ref. */
  onEvaluating?: (value: boolean) => void
  /**
   * When true, skip the initial mount evaluation; evaluate only when `deps` change. With the
   * default `[]` deps the hook then never evaluates.
   *
   * This is the reause replacement for upstream's `lazy`. Upstream's `lazy` starts evaluation on
   * the first access to the returned computed; React has no first-access hook, so that semantic has
   * no equivalent here.
   *
   * @default false
   */
  skipInitial?: boolean
  /**
   * @deprecated Use `skipInitial` instead. Kept as an alias with identical
   * behavior (skip the mount evaluation); it does NOT carry upstream's
   * "evaluate on the first access" semantics. `skipInitial` wins when both
   * are passed.
   */
  lazy?: boolean
  /** Called when the evaluation callback rejects; the current state is kept. */
  onError?: (error: unknown) => void
}

/**
 * Default `onError` — mirrors upstream's `globalThis.reportError` fallback. `reportError` must be
 * invoked with the global object as `this`, otherwise Chromium throws "Illegal invocation" for a
 * detached call.
 */
function defaultOnError(e: unknown) {
  if (typeof globalThis.reportError === 'function')
    globalThis.reportError(e)
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof (value as Partial<Promise<T>> | undefined)?.then === 'function'
}

const EMPTY_DEPS: unknown[] = []

/**
 * Map from @vueuse/core `computedAsync`
 * (`source/vueuse/packages/core/computedAsync/`).
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const downloads = useAsync(
 *   async (onCancel) => {
 *     const controller = new AbortController()
 *     onCancel(() => controller.abort())
 *     const response = await fetch(url, { signal: controller.signal })
 *     return response.ok ? (await response.json() as { downloads: number }).downloads : 0
 *   },
 *   0,
 *   { deps: [packageName] },
 * )
 *
 * @see https://vueuse.org/computedAsync/
 */
export function useAsync<T>(
  evaluationCallback: (onCancel: UseAsyncOnCancel) => T | Promise<T>,
  initialState: State<T>,
  options?: UseAsyncOptions,
): T
export function useAsync<T>(
  evaluationCallback: (onCancel: UseAsyncOnCancel) => T | Promise<T>,
  initialState?: undefined,
  options?: UseAsyncOptions,
): T | undefined
export function useAsync<T>(
  evaluationCallback: (onCancel: UseAsyncOnCancel) => T | Promise<T>,
  initialState?: State<T>,
  options?: UseAsyncOptions,
): T | undefined {
  const {
    deps = EMPTY_DEPS,
    skipInitial: skipInitialOption,
    lazy = false,
    onEvaluating = noop,
    onError = defaultOnError,
  } = options ?? {}

  // `skipInitial` supersedes the deprecated `lazy` alias when both are passed.
  const skipInitial = skipInitialOption ?? lazy

  // `initialState` may be omitted; `useControllableState` takes a required
  // `State<T | undefined>`. The tuple/object `State` forms are invariant in
  // `T`, so the optional state is widened through `unknown` (the runtime
  // value is passed through unchanged).
  const [state, setState] = useControllableState<T | undefined>(
    initialState as unknown as State<T | undefined>,
    { passive: true },
  )

  // Latest-input mirrors synced every render (house pattern) so the effect
  // always reads the newest inputs while `deps` stays the only trigger.
  const evaluationCallbackRef = useRef(evaluationCallback)
  evaluationCallbackRef.current = evaluationCallback
  const skipInitialRef = useRef(skipInitial)
  skipInitialRef.current = skipInitial
  const onEvaluatingRef = useRef(onEvaluating)
  onEvaluatingRef.current = onEvaluating
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // Monotonically increasing evaluation id — only the latest evaluation may
  // update the state (mirrors upstream's `counter`).
  const evaluationIdRef = useRef(0)
  // Flipped by the dedicated mount effect below so async continuations can
  // never touch state or signals after unmount.
  const isMountedRef = useRef(true)
  // `false` until the first evaluation effect run — drives `skipInitial`.
  const hasEvaluatedRef = useRef(false)

  useEffect(() => {
    const isFirstRun = !hasEvaluatedRef.current
    hasEvaluatedRef.current = true

    if (isFirstRun && skipInitialRef.current) {
      // skipInitial: skip the mount evaluation — evaluate only when deps change
      return
    }

    const id = (evaluationIdRef.current += 1)
    let hasFinished = false
    let settled = false
    const cancelCallbacks: Fn[] = []

    const settle = () => {
      if (settled || !isMountedRef.current)
        return
      settled = true
      onEvaluatingRef.current(false)
    }

    const invalidate = () => {
      settle()
      if (!hasFinished) {
        // invoke and clear the cancellation registry (upstream parity)
        const callbacks = cancelCallbacks.splice(0, cancelCallbacks.length)
        callbacks.forEach(cancelCallback => cancelCallback())
      }
    }

    onEvaluatingRef.current(true)

    try {
      const result = evaluationCallbackRef.current((cancelCallback) => {
        cancelCallbacks.push(cancelCallback)
      })

      if (isPromiseLike(result)) {
        result.then((value) => {
          hasFinished = true
          if (id === evaluationIdRef.current && isMountedRef.current)
            setState(value)
          settle()
        }, (error) => {
          hasFinished = true
          onErrorRef.current(error)
          settle()
        })
      }
      else {
        // sync return value — update the state within the effect
        hasFinished = true
        setState(result)
        settle()
      }
    }
    catch (error) {
      // synchronous throw from evaluationCallback — upstream catches it too
      hasFinished = true
      onErrorRef.current(error)
      settle()
    }

    return invalidate
  }, deps)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return state
}
