import { useEffect, useMemo, useRef } from 'react'
import { noop } from '../index'

export type FunctionArgs<Args extends any[] = any[], Return = unknown> = (...args: Args) => Return

export interface DebounceFilterOptions {
  /**
   * The maximum time allowed to be delayed before it's invoked. In milliseconds.
   */
  maxWait?: number

  /**
   * Whether to reject the last call if it's been cancelled.
   *
   * @default false
   */
  rejectOnCancel?: boolean
}

export interface UseDebounceFnReturn<T extends FunctionArgs> {
  (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>>
  /**
   * Cancel the pending invocation — the outstanding promise settles (resolves, or rejects with
   * `rejectOnCancel`) without calling `fn`.
   */
  cancel: () => void
  /**
   * Invoke the pending call immediately and settle its promise with the result.
   */
  flush: () => void
  /**
   * `true` while a call is waiting to be invoked.
   *
   * Note: unlike upstream's reactive readonly ref, this is a plain (non-reactive) getter — read it
   * imperatively, it does not trigger re-renders.
   */
  readonly isPending: boolean
}

/**
 * Map from @vueuse/shared `useDebounceFn`.
 *
 * @example
 * const debouncedFn = useDebounceFn(() => { ... }, 1000)
 * debouncedFn()
 * debouncedFn.cancel()
 * debouncedFn.flush()
 */
export function useDebounceFn<T extends FunctionArgs>(
  fn: T,
  ms: number = 200,
  options: DebounceFilterOptions = {},
): UseDebounceFnReturn<T> {
  // keep the latest fn / ms / options in refs so the debounced wrapper
  // stays referentially stable across renders
  const fnRef = useRef(fn)
  fnRef.current = fn
  const msRef = useRef(ms)
  msRef.current = ms
  const optionsRef = useRef(options)
  optionsRef.current = options

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef(false)
  // settlement callbacks of the currently pending call's promise — `onCancel`
  // settles without invoking (upstream: `lastRejector`), `onFlush` invokes the
  // debounced fn and resolves with its result (upstream: `lastResolve` +
  // `lastInvoker`)
  const onCancelRef = useRef<() => void>(noop)
  const onFlushRef = useRef<() => void>(noop)
  // the latest pending invocation (upstream: `lastInvoker`)
  const lastInvokeRef = useRef<() => unknown>(noop)

  // build the debounced wrapper once so its identity is stable across renders
  const debounced = useMemo(() => {
    const clearTimers = (): void => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (maxTimerRef.current !== null) {
        clearTimeout(maxTimerRef.current)
        maxTimerRef.current = null
      }
    }

    const settleCurrent = (settleRef: { current: () => void }): void => {
      const callback = settleRef.current
      onCancelRef.current = noop
      onFlushRef.current = noop
      pendingRef.current = false
      callback()
    }

    const handler = (invoke: () => unknown): Promise<unknown> => {
      const duration = msRef.current
      const maxDuration = optionsRef.current.maxWait

      // a newer call supersedes the pending one — settle its promise
      // without invoking (upstream: `_clearTimeout` → `lastRejector`);
      // the maxWait timer intentionally survives until it fires or is cleared
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
        settleCurrent(onCancelRef)
      }

      if (duration === undefined || duration <= 0 || (maxDuration !== undefined && maxDuration <= 0)) {
        clearTimers()
        pendingRef.current = false
        // upstream wraps the invocation in a Promise executor, so a synchronous
        // throw becomes a rejection instead of propagating to the caller
        try {
          return Promise.resolve(invoke())
        }
        catch (error) {
          return Promise.reject(error)
        }
      }

      pendingRef.current = true

      return new Promise((resolve, reject) => {
        onCancelRef.current = optionsRef.current.rejectOnCancel ? reject : () => resolve(undefined)
        onFlushRef.current = () => resolve(invoke())
        lastInvokeRef.current = invoke

        // create the maxWait timer — it clears the regular timer on fire
        if (maxDuration !== undefined && maxTimerRef.current === null) {
          maxTimerRef.current = setTimeout(() => {
            maxTimerRef.current = null
            if (timerRef.current !== null) {
              clearTimeout(timerRef.current)
              timerRef.current = null
            }
            // upstream maxTimer settles the pending promise via `lastRejector`
            // (undefined, or rejects with `rejectOnCancel`) and then runs the
            // latest invocation on the trailing edge — its result is discarded
            const invoke = lastInvokeRef.current
            settleCurrent(onCancelRef)
            invoke()
          }, maxDuration)
        }

        // create the regular timer — it clears the maxWait timer on fire
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          if (maxTimerRef.current !== null) {
            clearTimeout(maxTimerRef.current)
            maxTimerRef.current = null
          }
          settleCurrent(onFlushRef)
        }, duration)
      })
    }

    const cancel = (): void => {
      clearTimers()
      settleCurrent(onCancelRef)
    }

    const flush = (): void => {
      if (!pendingRef.current)
        return
      clearTimers()
      settleCurrent(onFlushRef)
    }

    const wrapped = ((...args: Parameters<T>) => {
      return handler(() => fnRef.current(...args))
    }) as UseDebounceFnReturn<T>

    wrapped.cancel = cancel
    wrapped.flush = flush
    Object.defineProperty(wrapped, 'isPending', {
      enumerable: true,
      get: () => pendingRef.current,
    })

    return wrapped
  }, [])

  // clear any pending timers when the component unmounts
  useEffect(() => debounced.cancel, [debounced])

  return debounced
}
