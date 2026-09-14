import type { UseWatchCallback, UseWatchOptions } from '../useWatch'
import { useCallback, useRef } from 'react'
import { useWatch } from '../useWatch'

export interface UseWatchOnceReturn {
  /**
   * Stop watching before the callback has fired — further source changes are ignored. Calling it
   * after the callback fired is a no-op.
   */
  stop: () => void
}

// overloads
export function useWatchOnce<T extends any[]>(source: readonly [...T], callback: UseWatchCallback<[...T]>, options?: UseWatchOptions): UseWatchOnceReturn
export function useWatchOnce<T>(source: T, callback: UseWatchCallback<T>, options?: UseWatchOptions): UseWatchOnceReturn

// implementation
/**
 * Shorthand for watching value with `{ once: true }` — the callback fires at most once (the first
 * matching change) and the watcher stops afterwards — React port of VueUse's `watchOnce`.
 *
 * Map from @vueuse/shared `watchOnce`.
 *
 * Mapping: upstream is a shorthand for `watch(source, cb, {...options, once: true })`. This port
 * builds the same shorthand on the house `useWatch` (like `useWatchAtMost` does with `count: 1`):
 * the callback is wrapped with a `stopped` ref — the first invocation forwards `(value, oldValue)`
 * and marks the watcher stopped, so every further source change is ignored. An `immediate: true`
 * call counts toward the once.
 *
 * React divergences:
 * - Returns `{ stop }` instead of the full Vue `WatchHandle` — `stop` disables further fires early
 * (matching upstream's `stop()`); disposal otherwise follows the component lifecycle.
 * - The source is a plain value (or array of values) tracked across renders —
 *   Vue's `WatchSource` forms (ref / getter / reactive) have no React
 *   equivalent, and the `deep` / `flush` watch options don't apply.
 *
 * @example
 * ```ts
 * useWatchOnce(count, (value, oldValue) => console.log(value, oldValue))
 * ```
 */
export function useWatchOnce(source: any, callback: UseWatchCallback, options: UseWatchOptions = {}): UseWatchOnceReturn {
  const stoppedRef = useRef(false)

  const stop = useCallback(() => {
    stoppedRef.current = true
  }, [])

  function wrapped(value: any, oldValue: any) {
    if (stoppedRef.current)
      return

    stoppedRef.current = true
    callback(value, oldValue)
  }

  useWatch(source, wrapped, options)

  return { stop }
}
