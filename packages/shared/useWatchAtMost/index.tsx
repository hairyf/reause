import type { UseWatchCallback } from '../useWatch'
import { useCallback, useRef, useState } from 'react'
import { useWatch } from '../useWatch'

export interface UseWatchAtMostOptions {
  /**
   * The maximum number of times the callback may fire.
   */
  count: number
  /**
   * Fire the callback once on mount with the current value.
   * @default false
   */
  immediate?: boolean
}

export interface UseWatchAtMostReturn {
  /**
   * The number of times the callback has fired so far.
   */
  count: number
  /**
   * Stop watching before the limit is reached.
   */
  stop: () => void
  /**
   * Pause the watch — source changes do not fire the callback nor count towards the limit until
   * `resume` is called.
   */
  pause: () => void
  /**
   * Resume a paused watch.
   */
  resume: () => void
}

// overloads
export function useWatchAtMost<T extends any[]>(source: readonly [...T], callback: UseWatchCallback<[...T]>, options: UseWatchAtMostOptions): UseWatchAtMostReturn
export function useWatchAtMost<T>(source: T, callback: UseWatchCallback<T>, options: UseWatchAtMostOptions): UseWatchAtMostReturn

// implementation
/**
 * Map from @vueuse/shared `watchAtMost`.
 *
 * @example
 * ```tsx
 * const { count, stop } = useWatchAtMost(num, (value, oldValue) => {
 *   console.log(value, oldValue)
 * }, { count: 3 })
 * ```
 */
export function useWatchAtMost(source: any, callback: UseWatchCallback, options: UseWatchAtMostOptions): UseWatchAtMostReturn {
  const { count: maxCount, ...watchOptions } = options

  const [count, setCount] = useState(0)
  const firedRef = useRef(0)
  const stoppedRef = useRef(false)
  const pausedRef = useRef(false)

  // keep the latest limit so a changing `count` option is honored on each fire
  const maxCountRef = useRef(maxCount)
  maxCountRef.current = maxCount

  const stop = useCallback(() => {
    stoppedRef.current = true
  }, [])

  const pause = useCallback(() => {
    pausedRef.current = true
  }, [])

  const resume = useCallback(() => {
    pausedRef.current = false
  }, [])

  function wrapped(value: any, oldValue: any) {
    if (stoppedRef.current || pausedRef.current)
      return

    firedRef.current += 1
    setCount(firedRef.current)
    callback(value, oldValue)

    if (firedRef.current >= maxCountRef.current)
      stoppedRef.current = true
  }

  useWatch(source, wrapped, watchOptions)

  return { count, stop, pause, resume }
}
