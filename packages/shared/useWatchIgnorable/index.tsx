import type { UseWatchCallback } from '../useWatch'
import { useCallback, useEffect, useRef } from 'react'
import { useWatch } from '../useWatch'

export type IgnoredUpdater = (updater: () => void) => void
export type IgnoredPrevAsyncUpdates = () => void

export interface UseWatchIgnorableReturn {
  /**
   * Run `updater`, ignoring the watch for the source changes it makes — as long as no other changes
   * follow, the callback is not fired for that batch.
   */
  ignoreUpdates: IgnoredUpdater

  /**
   * Ignore the source changes made since the last time the callback fired — as long as no other
   * changes follow, the callback is not fired for that batch.
   */
  ignorePrevAsyncUpdates: IgnoredPrevAsyncUpdates

  /**
   * Stop watching — further source changes will not fire the callback.
   */
  stop: () => void
}

export interface UseWatchIgnorableOptions {
  /**
   * Fire the callback once on mount with the current value.
   * @default false
   */
  immediate?: boolean

  /**
   * Stop the watch after the callback has fired once. Ignored fires do not count towards the limit.
   * @default false
   */
  once?: boolean
}

/**
 * Map from @vueuse/shared `watchIgnorable`.
 *
 * @example
 * ```ts
 * const [source, setSource] = useState('foo')
 * const { ignoreUpdates } = useWatchIgnorable(source, v => console.log(`Changed to ${v}!`))
 * setSource('bar') // logs: Changed to bar!
 * ignoreUpdates(() => setSource('foobar')) // (nothing logged)
 * ```
 */
export function useWatchIgnorable<T extends any[]>(source: readonly [...T], callback: UseWatchCallback<[...T]>, options?: UseWatchIgnorableOptions): UseWatchIgnorableReturn
export function useWatchIgnorable<T>(source: T, callback: UseWatchCallback<T>, options?: UseWatchIgnorableOptions): UseWatchIgnorableReturn
export function useWatchIgnorable(source: any, callback: UseWatchCallback, options: UseWatchIgnorableOptions = {}): UseWatchIgnorableReturn {
  const { immediate, once } = options

  // — ignore barrier — the React equivalent of upstream's counters —
  const lastSeenRef = useRef(source) // value observed at the last watch fire
  const snapshotRef = useRef(source) // observed value when the barrier was armed
  const ignoreRef = useRef(false) // one-shot skip flag
  const stoppedRef = useRef(false)

  useWatch(source, (value, oldValue) => {
    lastSeenRef.current = value
    const ignore = ignoreRef.current
    ignoreRef.current = false
    if (ignore || stoppedRef.current)
      return
    callback(value, oldValue)
    if (once)
      stoppedRef.current = true
  }, { immediate })

  // Disarm the barrier when a commit carries no source change (the updater
  // produced nothing observable) so it cannot consume a later genuine change.
  useEffect(() => {
    if (ignoreRef.current && Object.is(source, snapshotRef.current))
      ignoreRef.current = false
  })

  const ignoreUpdates = useCallback<IgnoredUpdater>((updater) => {
    // Snapshot the observed value before the updater runs — the next watch
    // trigger is skipped when it observes a change since this snapshot.
    snapshotRef.current = lastSeenRef.current
    updater()
    ignoreRef.current = true
  }, [])

  const ignorePrevAsyncUpdates = useCallback<IgnoredPrevAsyncUpdates>(() => {
    // Snapshot-style one-shot skip for the changes queued before this call.
    snapshotRef.current = lastSeenRef.current
    ignoreRef.current = true
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
  }, [])

  return { ignoreUpdates, ignorePrevAsyncUpdates, stop }
}
