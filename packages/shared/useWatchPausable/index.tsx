import type { UseWatchCallback } from '../useWatch'
import { useCallback, useRef, useState } from 'react'
import { useWatch } from '../useWatch'

export interface UseWatchPausableOptions {
  /**
   * The initial state of the watcher.
   *
   * @default 'active'
   */
  initialState?: 'active' | 'paused'

  /**
   * Fire the callback once on mount with the current source value (still subject to the pause
   * state).
   *
   * @default false
   */
  immediate?: boolean
}

export interface UseWatchPausableReturn {
  /**
   * Pause the watcher — source changes will not fire the callback while paused. Changes made while
   * paused are dropped.
   */
  pause: () => void

  /**
   * Resume the watcher — re-activates the callback for future changes. It does not replay changes
   * made while paused.
   */
  resume: () => void

  /**
   * Whether the watcher is currently active.
   */
  isActive: boolean

  /**
   * Stop the watcher — the callback never fires again.
   */
  stop: () => void
}

/**
 * Map from @vueuse/shared `watchPausable`.
 *
 * @example
 * ```ts
 * const [source, setSource] = useState('foo')
 * const { pause, resume } = useWatchPausable(source, v => console.log(`Changed to ${v}!`))
 * setSource('bar') // logs: Changed to bar!
 * pause()
 * setSource('foobar') // (nothing logged)
 * resume()
 * setSource('hello') // logs: Changed to hello!
 * ```
 */
export function useWatchPausable<T extends any[]>(source: readonly [...T], callback: UseWatchCallback<[...T]>, options?: UseWatchPausableOptions): UseWatchPausableReturn
export function useWatchPausable<T>(source: T, callback: UseWatchCallback<NoInfer<T>>, options?: UseWatchPausableOptions): UseWatchPausableReturn
export function useWatchPausable(source: any, callback: UseWatchCallback, options: UseWatchPausableOptions = {}): UseWatchPausableReturn {
  const { initialState = 'active', immediate } = options

  const [isActive, setIsActive] = useState(initialState === 'active')

  // Synchronous mirror of the pause state — lets a `pause()` / `resume()` made
  // in the same batch as a source change still be honoured when the effect
  // runs after commit.
  const activeRef = useRef(initialState === 'active')
  const stoppedRef = useRef(false)

  const pause = useCallback(() => {
    activeRef.current = false
    setIsActive(false)
  }, [])

  const resume = useCallback(() => {
    activeRef.current = true
    setIsActive(true)
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
  }, [])

  useWatch(source, (current, oldValue) => {
    if (!activeRef.current || stoppedRef.current)
      return
    callback(current, oldValue)
  }, { immediate })

  return { pause, resume, isActive, stop }
}
