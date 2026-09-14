import type { FunctionArgs } from '../index'
import type { DebounceFilterOptions } from '../useDebounceFn'
import type { UseWatchCallback } from '../useWatch'
import { useCallback, useEffect, useRef } from 'react'
import { useWatch } from '../useWatch'

/**
 * Filter for if events should to be received — the house equivalent of upstream's `EventFilter`
 * (`@vueuse/shared` `utils/filters.ts`).
 *
 * Upstream is generic over the wrapped function (`EventFilter<Args, This, Invoke>` returning
 * `ReturnType<Invoke> | Promisify<ReturnType<Invoke>>`); the watch path discards the wrapped
 * callback's return value, so the contract collapses to `(invoke: FunctionArgs, options?:
 * Record<string, unknown>) => void`. The optional second argument.g. `useMouse` passes `{}`), so a
 * chained filter reads an object instead of `undefined`.
 */
export type EventFilter = (invoke: FunctionArgs, options?: Record<string, unknown>) => void

/**
 * An `EventFilter` that carries cancellation controls, as returned by `debounceFilter`.
 *
 * `isPending` is a plain (non-reactive) getter — React has no reactive refs, read it imperatively.
 */
export interface CancelableEventFilter extends EventFilter {
  cancel: () => void
  flush: () => void
  readonly isPending: boolean
}

export interface UseWatchWithFilterOptions {
  /**
   * Filter for if events should to be received.
   *
   * The filter instance is captured once on mount — like upstream, where the watch options are
   * evaluated once during setup — so an inline `debounceFilter(300)` is safe; pass a getter-based
   * delay (`debounceFilter(() => ms)`) when the delay must change over time.
   *
   * @default bypassFilter (invoke directly)
   */
  eventFilter?: EventFilter

  /**
   * Fire the callback once on mount with the current value (still filtered).
   * @default false
   */
  immediate?: boolean
}

/**
 * The stop function returned by `useWatchWithFilter` — upstream's `WatchHandle`, reduced to the
 * stop capability (house `useWatch` has no stop-handle infrastructure).
 */
export type UseWatchWithFilterReturn = () => void

// the default filter (upstream `bypassFilter`) — kept internal so the new
// exports stay minimal; the hook applies it as the option's default
function bypassFilter(invoke: FunctionArgs): void {
  invoke()
}

/**
 * Create an EventFilter that debounce the events — in-house port of upstream `@vueuse/shared`
 * `debounceFilter` (trailing edge + `maxWait`).
 *
 * Mapping: same collapsing semantics as upstream (a newer call supersedes the pending one; the
 * `maxWait` timer survives re-scheduling and forces the call with the latest `invoke`).
 * Divergences: the promise-settlement plumbing (`lastRejector` / `rejectOnCancel`) is dropped — the
 * house `EventFilter` contract returns `void` and the watch path consumes no promise, so
 * `rejectOnCancel` has no observable effect — and `isPending` is a plain getter instead of a
 * reactive ref. `ms` is a plain number, re-read on every call. Pending timers are cleared by
 * `cancel()` — the `useWatchWithFilter` hook calls it on stop / unmount.
 *
 * @example
 * ```ts
 * useWatchWithFilter(input, callback, { eventFilter: debounceFilter(300, { maxWait: 1000 }) })
 * ```
 */
export function debounceFilter(ms: number = 200, options: DebounceFilterOptions = {}): CancelableEventFilter {
  let timer: ReturnType<typeof setTimeout> | undefined
  let maxTimer: ReturnType<typeof setTimeout> | undefined
  let pending = false
  let lastInvoker: (() => void) | undefined

  const clearTimers = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    if (maxTimer !== undefined) {
      clearTimeout(maxTimer)
      maxTimer = undefined
    }
  }

  const handler = (invoke: FunctionArgs): void => {
    const duration = ms
    const maxDuration = options.maxWait

    // a newer call supersedes the pending one — drop its timer without
    // invoking (upstream: `_clearTimeout` → `lastRejector`); the maxWait
    // timer intentionally survives until it fires or is cleared
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }

    if (duration === undefined || duration <= 0 || (maxDuration !== undefined && maxDuration <= 0)) {
      clearTimers()
      pending = false
      invoke()
      return
    }

    pending = true
    lastInvoker = invoke

    // create the maxWait timer — it clears the regular timer on fire
    if (maxDuration !== undefined && maxTimer === undefined) {
      maxTimer = setTimeout(() => {
        maxTimer = undefined
        if (timer !== undefined) {
          clearTimeout(timer)
          timer = undefined
        }
        pending = false
        lastInvoker?.()
      }, maxDuration)
    }

    // create the regular timer — it clears the maxWait timer on fire
    timer = setTimeout(() => {
      timer = undefined
      if (maxTimer !== undefined) {
        clearTimeout(maxTimer)
        maxTimer = undefined
      }
      pending = false
      invoke()
    }, duration)
  }

  const filter = handler as CancelableEventFilter

  filter.cancel = (): void => {
    clearTimers()
    pending = false
    lastInvoker = undefined
  }

  filter.flush = (): void => {
    if (!pending)
      return
    clearTimers()
    pending = false
    const invoker = lastInvoker
    lastInvoker = undefined
    invoker?.()
  }

  Object.defineProperty(filter, 'isPending', {
    enumerable: true,
    get: () => pending,
  })

  return filter
}

/**
 * Create an EventFilter that throttle the events — in-house port of upstream `@vueuse/shared`
 * `throttleFilter` (leading/trailing edges with a trailing invoke on window end).
 *
 * Mapping: same collapsing semantics as upstream — a call inside the throttle window re-schedules
 * the trailing timer with the remaining time, collapsing bursts into one trailing call carrying the
 * latest `invoke`. Divergences: the promise-settlement plumbing (`rejectOnCancel`, upstream's
 * fourth parameter) is dropped — the house `EventFilter` contract returns `void` — and the object
 * options form is not ported (positional `throttleFilter(ms, trailing, leading)` like the house
 * `useThrottleFn`). `ms` is a plain number, re-read on every call.
 *
 * @example
 * ```ts
 * useWatchWithFilter(scrollY, callback, { eventFilter: throttleFilter(100, true, false) })
 * ```
 */
export function throttleFilter(ms: number = 200, trailing = true, leading = true): EventFilter {
  let lastExec = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let isLeading = true

  const clear = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  return (invoke: FunctionArgs): void => {
    const duration = ms
    const elapsed = Date.now() - lastExec

    clear()

    if (duration === undefined || duration <= 0) {
      lastExec = Date.now()
      invoke()
      return
    }

    if (elapsed > duration) {
      lastExec = Date.now()
      if (leading || !isLeading)
        invoke()
    }
    else if (trailing) {
      timer = setTimeout(() => {
        lastExec = Date.now()
        isLeading = true
        invoke()
        clear()
      }, Math.max(0, duration - elapsed))
    }

    // keep `isLeading` accurate for a leading=false wrapper so a call in a
    // fresh window is suppressed until the quiet-window marker settles
    if (!leading && timer === undefined) {
      timer = setTimeout(() => {
        isLeading = true
      }, duration)
    }

    isLeading = false
  }
}

// overloads
export function useWatchWithFilter<T extends any[]>(source: readonly [...T], callback: UseWatchCallback<[...T]>, options?: UseWatchWithFilterOptions): UseWatchWithFilterReturn
export function useWatchWithFilter<T>(source: T, callback: UseWatchCallback<T>, options?: UseWatchWithFilterOptions): UseWatchWithFilterReturn

// implementation
/**
 * Map from @vueuse/shared `watchWithFilter`.
 *
 * @example
 * ```ts
 * const stop = useWatchWithFilter(count, (value, oldValue) => console.log(value, oldValue))
 * useWatchWithFilter(count, callback, { eventFilter: debounceFilter(300) })
 * stop()
 * ```
 */
export function useWatchWithFilter(source: any, callback: UseWatchCallback, options: UseWatchWithFilterOptions = {}): UseWatchWithFilterReturn {
  const { eventFilter = bypassFilter, immediate = false } = options

  const stoppedRef = useRef(false)
  // stable across renders — the latest `callback` is re-mirrored on every
  // render, the filter instance is captured once on mount (see the mapping
  // note above)
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const filterRef = useRef(eventFilter)

  function wrapped(value: any, oldValue: any) {
    if (stoppedRef.current)
      return
    // every source change hands the latest `(value, oldValue)` pair to the
    // filter — upstream: `createFilterWrapper(eventFilter, cb)` around the
    // watch callback
    filterRef.current(() => {
      if (stoppedRef.current)
        return
      callbackRef.current(value, oldValue)
    })
  }

  useWatch(source, wrapped, { immediate })

  const stop = useCallback(() => {
    stoppedRef.current = true
    const cancelable = filterRef.current as Partial<CancelableEventFilter>
    if (typeof cancelable.cancel === 'function')
      cancelable.cancel()
  }, [])

  // close the gate and clear any pending filtered invocation when the
  // component unmounts (upstream leaves disposal to the effect scope)
  useEffect(() => stop, [stop])

  return stop
}
