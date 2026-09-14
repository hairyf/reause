import type { UseWatchCallback } from '../useWatch'
import { useWatch } from '../useWatch'

/**
 * Map from @vueuse/shared `watchImmediate`.
 *
 * @example
 * ```ts
 * // logs on mount ('vue-use') and again on every change ('VueUse', ...)
 * useWatchImmediate(obj, updated => console.log(updated))
 * useWatchImmediate([count, name], (value, oldValue) => console.log(value, oldValue))
 * ```
 */
export function useWatchImmediate<T extends any[]>(source: readonly [...T], callback: UseWatchCallback<[...T]>): void
export function useWatchImmediate<T>(source: T, callback: UseWatchCallback<T>): void
export function useWatchImmediate(source: any, callback: UseWatchCallback) {
  useWatch(source, callback, { immediate: true })
}
