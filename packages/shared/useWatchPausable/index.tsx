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
 * Pausable watch — a watched value whose updates can be paused and resumed — React
 * port of VueUse's `watchPausable`.
 *
 * Map from @vueuse/shared watchPausable. Upstream wraps `watchWithFilter` with
 * `pausableFilter`: while paused the event filter drops invocations, and `resume()` only
 * re-activates the filter — changes made while paused are never replayed, so the first change after
 * resuming fires the callback with the last change's value — the dropped one, if any — as
 * `oldValue`: the watch's tracked previous value advances through paused changes, where the filter
 * swallows the invocation but the underlying watch's `oldValue` still moves. This port keeps those
 * semantics on house primitives: `useWatch` tracks the source across renders (Vue's reactive
 * dependency tracking becomes the effect dependency list, firing in the effect after commit —
 * upstream `flush: 'pre'` timing) and the callback is skipped whenever the watcher is paused or
 * stopped.
 *
 * The API follows the maintainer-directed watch-wrapper convention of issue #263: the source is the
 * caller's own state value (house `useWatch` source convention) and the return is the upstream
 * `WatchPausableReturn` object shape.
 *
 * React divergences:
 * - `isActive` is a plain boolean state instead of a readonly ref — it updates
 *   across renders, and `pause()` / `resume()` made in the same batch as a
 *   source change are still honoured (the pause state is mirrored into a ref
 *   read by the effect).
 * - Changes made while paused are dropped — upstream `pausableFilter` defers
 *   nothing, so `resume()` does not replay them and never fires the callback
 *   by itself.
 * - The `deep`, `flush`, `eventFilter` watch options and the `onTrack` /
 *   `onTrigger` callbacks are not ported — tracking is by `Object.is`
 *   identity, like a Vue ref reassignment (upstream `WatchPausableOptions` is
 *   `WatchWithFilterOptions & PausableFilterOptions`; the `pausableFilter`
 *   half carries no options of its own, so there is no `eventFilterOptions`
 *   member).
 * - `stop()` keeps the effect registered but the callback becomes a no-op —
 *   observable behavior is identical (the callback never fires again), and
 *   `isActive` is unaffected, like upstream.
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
