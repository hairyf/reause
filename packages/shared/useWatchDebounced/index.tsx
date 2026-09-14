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
 * Map from @vueuse/shared `watchDebounced`.
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
