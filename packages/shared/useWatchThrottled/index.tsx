import type { UseWatchCallback } from '../useWatch'
import { useThrottleFn } from '../useThrottleFn'
import { useWatch } from '../useWatch'

export interface UseWatchThrottledOptions {
  /**
   * Throttle interval in milliseconds — a plain number, re-read on every source change.
   *
   * @default 0
   */
  throttle?: number

  /**
   * Invoke the callback on the trailing edge of the throttle window.
   *
   * @default true
   */
  trailing?: boolean

  /**
   * Invoke the callback on the leading edge of the throttle window.
   *
   * @default true
   */
  leading?: boolean

  /**
   * Fire the callback once on mount with the current value (still throttled).
   *
   * @default false
   */
  immediate?: boolean
}

/**
 * Throttled watch — the callback is invoked at most once per specified duration — React
 * port of VueUse's `watchThrottled`.
 * Map from @vueuse/shared watchThrottled.
 *
 * Mapping: upstream is a shorthand for `watchWithFilter(source, cb, { eventFilter:
 * throttleFilter(throttle, trailing, leading) })`. This port composes the same pieces from house
 * primitives: `useWatch` tracks the source across renders (Vue's reactive dependency tracking
 * becomes the effect dependency list) and hands every change to `useThrottleFn`, which implements
 * the upstream `throttleFilter` (leading/trailing edges with a trailing invoke on window end).
 * Changes inside the throttle window collapse into a single call carrying the latest `(value,
 * oldValue)` pair captured at the last change.
 *
 * React divergences:
 * - Returns `void` — upstream returns a `WatchHandle`; here disposal follows the component
 * lifecycle and pending timers.
 * - The source is a plain value (or array of values) tracked across renders —
 *   deep-reactive object sources and `deep` / `flush` watch options don't apply.
 * - upstream's deprecated `throttledWatch` alias is not ported.
 *
 * @example
 * ```ts
 * useWatchThrottled(input, (value, oldValue) => console.log(value, oldValue), { throttle: 500 })
 * useWatchThrottled([count, name], (value, oldValue) => console.log(value, oldValue), { throttle: 200 })
 * ```
 */
export function useWatchThrottled<T extends any[]>(source: readonly [...T], callback: UseWatchCallback<[...T]>, options?: UseWatchThrottledOptions): void
export function useWatchThrottled<T>(source: T, callback: UseWatchCallback<T>, options?: UseWatchThrottledOptions): void
export function useWatchThrottled(source: any, callback: UseWatchCallback, options: UseWatchThrottledOptions = {}) {
  const { throttle = 0, trailing = true, leading = true } = options

  // stable across renders — the latest `callback` is re-mirrored into
  // `useThrottleFn`'s refs on every render, and `throttle` / `trailing` /
  // `leading` are re-read on every source change
  const throttled = useThrottleFn(
    (value: any, oldValue: any) => callback(value, oldValue),
    throttle,
    trailing,
    leading,
  )

  useWatch(source, throttled, { immediate: options.immediate })
}
