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
 * Map from @vueuse/shared `watchOnce`.
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
