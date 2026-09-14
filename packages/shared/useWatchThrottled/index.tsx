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
 * Map from @vueuse/shared `watchThrottled`.
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
