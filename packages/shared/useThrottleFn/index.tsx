import type { FunctionArgs } from '../index'
import { useEffect, useMemo, useRef } from 'react'
import { noop } from '../index'

export type PromisifyFn<T extends FunctionArgs> = (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>

/**
 * Throttle execution of a function — React port of VueUse's `useThrottleFn`. Especially useful for
 * rate limiting execution of handlers on events like resize and scroll.
 *
 * Map from @vueuse/shared `useThrottleFn`
 * Mapping: upstream builds `createFilterWrapper(throttleFilter(ms, trailing, leading,
 * rejectOnCancel), fn)` and returns a plain `PromisifyFn<T>` — the throttled wrapper carries no
 * `cancel` / `flush` / `isPending` (unlike the debounce filter, upstream's `throttleFilter` is not
 * cancelable), so this port mirrors that: the return value is the wrapped function and nothing
 * more. The wrapper is built once (`useMemo`) so its identity is stable across renders — safe to
 * add/remove in effects; the latest `fn` / `ms` / `trailing` / `leading` / `rejectOnCancel` are
 * mirrored into refs so every call sees fresh values (upstream captures the flags once, at filter
 * creation). `ms` is a plain number, re-read on every call. The throttle filter logic is inlined.
 * The wrapper; upstream registers no disposal at all (`@__NO_SIDE_EFFECTS__`), so a pending call
 * would still fire there after teardown.
 *
 * @param   fn             A function to be executed after delay milliseconds. The `this` context and all arguments are passed through, as-is,
 *                                    to `callback` when the throttled-function is executed.
 * @param   ms             A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 *                                    (default value: 200)
 *
 * @param [trailing] if true, call fn again after the time is up (default value: true)
 *
 * @param [leading] if true, call fn on the leading edge of the ms timeout (default value: true)
 *
 * @param [rejectOnCancel] if true, reject the last call if it's been cancel (default value: false)
 *
 * @return  A new, throttled, function.
 *
 * @example
 * const throttledFn = useThrottleFn(() => { ... }, 1000)
 * throttledFn()
 */
export function useThrottleFn<T extends FunctionArgs>(
  fn: T,
  ms: number = 200,
  trailing = true,
  leading = true,
  rejectOnCancel = false,
): PromisifyFn<T> {
  // keep the latest fn / ms / flags in refs so the throttled wrapper
  // stays referentially stable across renders
  const fnRef = useRef(fn)
  fnRef.current = fn
  const msRef = useRef(ms)
  msRef.current = ms
  const trailingRef = useRef(trailing)
  trailingRef.current = trailing
  const leadingRef = useRef(leading)
  leadingRef.current = leading
  const rejectOnCancelRef = useRef(rejectOnCancel)
  rejectOnCancelRef.current = rejectOnCancel

  // build the throttled wrapper once so its identity is stable across renders
  const { throttled, clear } = useMemo(() => {
    let lastExec = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let isLeading = true
    let lastRejector: (...args: any[]) => void = noop
    let lastValue: unknown

    // settle the pending trailing call's promise without invoking
    // (upstream: `clear` → `lastRejector()`)
    const clear = (): void => {
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
        lastRejector()
        lastRejector = noop
      }
    }

    // inlined upstream `throttleFilter` — leading/trailing timestamps with a
    // trailing invoke on window end
    const handler = (_invoke: () => unknown): unknown => {
      const duration = msRef.current
      const elapsed = Date.now() - lastExec
      const invoke = (): unknown => {
        return (lastValue = _invoke())
      }

      clear()

      // deviation from upstream (`filters.ts` only checks `duration <= 0`):
      // a non-positive ms would otherwise schedule an immediate timeout —
      // invoke right away instead
      if (duration === undefined || duration <= 0) {
        lastExec = Date.now()
        return invoke()
      }
      if (elapsed > duration) {
        lastExec = Date.now()
        if (leadingRef.current || !isLeading)
          invoke()
      }
      else if (trailingRef.current) {
        lastValue = new Promise((resolve, reject) => {
          lastRejector = rejectOnCancelRef.current ? reject : resolve
          timer = setTimeout(() => {
            lastExec = Date.now()
            isLeading = true
            resolve(invoke())
            clear()
          }, Math.max(0, duration - elapsed))
        })
      }

      // keep `isLeading` accurate for a leading=false wrapper so a call in a
      // fresh window is suppressed until the quiet-window marker settles
      if (!leadingRef.current && timer === undefined) {
        timer = setTimeout(() => {
          isLeading = true
        }, duration)
      }

      isLeading = false
      return lastValue
    }

    const throttled = ((...args: Parameters<T>) => {
      return new Promise<unknown>((resolve, reject) => {
        Promise.resolve(handler(() => fnRef.current(...args)))
          .then(resolve)
          .catch(reject)
      })
    }) as PromisifyFn<T>

    return { throttled, clear }
  }, [])

  // clear any pending trailing timer when the component unmounts
  // (upstream leaves disposal to the effect scope; the wrapper exposes no
  // public cancel — upstream `throttleFilter` has none — so this stays
  // internal)
  useEffect(() => () => clear(), [clear])

  return throttled
}
