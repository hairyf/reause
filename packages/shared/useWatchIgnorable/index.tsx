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
 * Ignorable watch — extended watch that returns `ignoreUpdates(updater)` /
 * `ignorePrevAsyncUpdates()` / `stop` to ignore particular updates to the source — React
 * port of VueUse's `watchIgnorable`.
 * Map from @vueuse/shared watchIgnorable.
 *
 * The API follows the maintainer-directed adjustment of issue #263: the source is the caller's own
 * state value (house `useWatch` source convention) and the return is the upstream
 * `WatchIgnorableReturn` object shape — this deliberately overrides the house array-destructure
 * return convention.
 *
 * Mapping: upstream counts every source modification with a hidden `flush: 'sync'` shadow watcher
 * (`syncCounter`), accumulates the changes to skip in `ignoreCounter`, and skips a trigger only
 * when every counted change came from `ignoreUpdates` (`ignoreCounter === syncCounter`, both
 * counters reset together). React offers no way to observe — let alone intercept — the caller's
 * `setSource`: changes only become visible at the next commit, where automatic batching has already
 * collapsed consecutive updates into a single render. The port therefore approximates the counters
 * with a one-shot "ignore barrier": `ignoreUpdates(updater)` snapshots the latest observed value,
 * runs `updater` synchronously and arms the barrier; the next change the watch observes is skipped
 * (upstream skips it too when no other changes follow) and the flag is consumed either way, so
 * later genuine changes fire again. `ignorePrevAsyncUpdates()` arms the same barrier for the
 * changes queued before the call (snapshot-style one-shot skip). A commit that carries no source
 * change disarms the barrier so a no-op updater cannot consume a later genuine change.
 *
 * Divergences from upstream (React batching):
 * - Changes made inside `ignoreUpdates` and further changes made afterwards
 *   in the same synchronous batch collapse into one render, which the barrier
 *   skips as a whole — upstream would fire the trigger with the latest value.
 *   Let the updater's batch commit (return from the event handler) before
 *   making changes that must fire.
 * - If the updater produces no change and the very next commit carries a
 *   source change, that change is skipped where upstream would fire it (a
 *   commit without a source change disarms the barrier).
 * - The `flush` option is not ported — the callback fires in the effect after
 *   commit (upstream `flush: 'pre'` timing); where upstream's
 *   `flush: 'sync'` makes `ignorePrevAsyncUpdates` a no-op, here it always
 *   applies.
 * - Upstream's other `WatchWithFilterOptions` members are rejected:
 *   `deep` (no reactive graph to traverse — the source is compared by
 *   identity), `flush` (React commits are not configurable), and
 *   `eventFilter` (no filter pipeline); the option type does not accept them,
 *   so passing them fails type checking. `once` IS ported — the watch stops
 *   after the first fired change.
 * - `stop()` keeps the effect registered but the callback becomes a no-op —
 *   observable behavior is identical (the callback never fires again).
 * - The deprecated upstream alias `ignorableWatch` is not ported (house
 *   `useWatch*` naming convention).
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
