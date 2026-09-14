import type { DebounceFilterOptions } from '../useDebounceFn'
import type { UseWatchCallback } from '../useWatch'
import { useDebounceFn } from '../useDebounceFn'
import { useWatch } from '../useWatch'

export interface UseWatchDebouncedOptions extends DebounceFilterOptions {
  /**
   * Debounce delay in milliseconds — a plain number, re-read on every source change.
   *
   * @default 0
   */
  debounce?: number

  /**
   * Fire the callback once on mount with the current value (still debounced).
   *
   * @default false
   */
  immediate?: boolean
}

/**
 * Debounced watch — the callback fires only after the source stops changing for the specified
 * duration — React port of VueUse's `watchDebounced`.
 *
 * Map from @vueuse/shared `watchDebounced`
 * Mapping: upstream is a shorthand for `watchWithFilter(source, cb, { eventFilter:
 * debounceFilter(debounce, { maxWait }) })`. This port composes the same pieces from house
 * primitives: `useWatch` tracks the source across renders (Vue's reactive dependency tracking
 * becomes the effect dependency list) and hands every change to `useDebounceFn`, which implements
 * the upstream `debounceFilter` (trailing edge + `maxWait`). Bursts of changes collapse into a
 * single call carrying the latest `(value, oldValue)` pair captured at the last change.
 *
 * React divergences:
 * - Returns `void` — upstream returns a `WatchHandle`; here disposal follows the component
 * lifecycle and pending timers.
 * - The source is a plain value (or array of values) tracked across renders —
 *   deep-reactive object sources and `deep` / `flush` watch options don't apply.
 * - `rejectOnCancel` (inherited from `DebounceFilterOptions`) is forwarded to
 *   `useDebounceFn` but has no observable effect — watch callbacks return
 *   nothing, so there is no promise to reject.
 *
 * @example
 * ```ts
 * useWatchDebounced(input, (value, oldValue) => console.log(value, oldValue), { debounce: 500, maxWait: 1000 })
 * useWatchDebounced([count, name], (value, oldValue) => console.log(value, oldValue), { debounce: 200 })
 * ```
 */
export function useWatchDebounced<T extends any[]>(source: readonly [...T], callback: UseWatchCallback<[...T]>, options?: UseWatchDebouncedOptions): void
export function useWatchDebounced<T>(source: T, callback: UseWatchCallback<T>, options?: UseWatchDebouncedOptions): void
export function useWatchDebounced(source: any, callback: UseWatchCallback, options: UseWatchDebouncedOptions = {}) {
  const { debounce = 0, maxWait, rejectOnCancel } = options

  // stable across renders — the latest `callback` is re-mirrored into
  // `useDebounceFn`'s refs on every render, and `debounce` / `maxWait` are
  // re-read on every source change
  const debounced = useDebounceFn(
    (value: any, oldValue: any) => callback(value, oldValue),
    debounce,
    { maxWait, rejectOnCancel },
  )

  useWatch(source, debounced, { immediate: options.immediate })
}
