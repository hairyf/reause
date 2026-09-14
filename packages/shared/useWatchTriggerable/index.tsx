import type { IgnoredUpdater } from '../useWatchIgnorable'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWatch } from '../useWatch'

export type OnCleanup = (cleanupFn: () => void) => void

export interface UseWatchTriggerableCallback<V = any, OV = any, R = void> {
  (value: V, oldValue: OV, onCleanup: OnCleanup): R
}

/** Per-element optional old value for array sources (upstream `MapOldSources<T, true>`). */
export type UseWatchTriggerableOldValues<T extends readonly any[]> = { [K in keyof T]: T[K] | undefined }

export interface UseWatchTriggerableReturn<R = void> {
  /**
   * Execute the callback immediately with the current source value — the old value is unknown
   * (`undefined`, per-element for array sources) for a manual call, and the invocation does not
   * count as a source change: a source change queued inside the callback is itself ignored.
   */
  trigger: () => R

  /**
   * Run `updater`, ignoring the watch for the source changes it makes — as long as no other changes
   * follow, the callback is not fired for that batch.
   */
  ignoreUpdates: IgnoredUpdater

  /**
   * Ignore the source changes made since the last time the callback fired — as long as no other
   * changes follow, the callback is not fired for that batch.
   */
  ignorePrevAsyncUpdates: () => void

  /**
   * Stop watching — further source changes will not fire the callback.
   */
  stop: () => void
}

export interface UseWatchTriggerableOptions {
  /**
   * Fire the callback once on mount with the current value.
   * @default false
   */
  immediate?: boolean
}

/**
 * Watch that can be triggered manually — extended watch that returns `trigger()` to execute the
 * callback immediately — React port of VueUse's `watchTriggerable`.
 * Map from @vueuse/shared watchTriggerable.
 *
 * The API follows the maintainer-directed adjustment of issue #263: the source is the caller's own
 * state value (house `useWatch` source convention) and the return is the upstream
 * `WatchTriggerableReturn` object shape — this deliberately overrides the house array-destructure
 * return convention, and the hook holds no observable state of its own (the internal render tick is
 * invisible to the caller).
 *
 * Mapping: upstream builds on `watchIgnorable`, which counts every source modification with a
 * hidden `flush: 'sync'` shadow watcher (`syncCounter`), accumulates the changes to skip in
 * `ignoreCounter`, and skips a trigger only when every counted change came from `ignoreUpdates`
 * (`ignoreCounter === syncCounter`); `trigger()` calls the callback with the current source value
 * wrapped in `ignoreUpdates` so the manual invocation does not disturb that accounting, and the
 * previously registered `onCleanup` side effect is cleaned up before every new invocation.
 *
 * React sees the caller's changes only at commit — there is no way to observe (let alone intercept)
 * `setSource`, and automatic batching has already collapsed consecutive updates into a single
 * render by then. The counters are therefore approximated with a one-shot "ignore barrier":
 * `ignoreUpdates(updater)` snapshots the latest observed value, runs `updater` synchronously and
 * arms the barrier; the next change the watch observes is skipped (upstream skips it too when no
 * other changes follow) and the flag is consumed either way, so later genuine changes fire again.
 * `ignorePrevAsyncUpdates()` arms the same barrier for the changes queued before the call. The
 * barrier is disarmed again when a commit carries no source change (the updater produced nothing
 * observable); an internal render tick guarantees such a commit even when the updater is a no-op
 * `setState` that React would otherwise bail out of entirely — so a no-op updater can never consume
 * a later genuine change (upstream counts 0 changes and fires).
 *
 * `trigger()` fires synchronously at the call site — it does not wait for React to commit and is
 * unaffected by batching: it hands the current source value straight to the callback with the old
 * value `undefined` (upstream cannot know it either; array sources get a per-element `undefined`)
 * and returns the callback's return value so async work can be awaited. Like upstream, the
 * invocation is wrapped in `ignoreUpdates`: a source change queued by the callback inside
 * `trigger()` is suppressed after its commit (upstream counts it in `ignoreCounter`), and a
 * callback that makes no source change is disarmed by the forced commit, so a later genuine change
 * still fires.
 *
 * Divergences from upstream (React batching):
 * - Changes made inside `ignoreUpdates` and further changes made afterwards
 *   in the same synchronous batch collapse into one render, which the
 *   barrier skips as a whole — upstream would fire the callback with the
 *   latest value. Let the updater's batch commit before making changes that
 *   must fire.
 * - The `flush` option is not ported — the callback fires in the effect after
 *   commit (upstream `flush: 'pre'` timing); `eventFilter` and the other
 *   `WatchWithFilterOptions` members (`deep`, pause/resume) are not ported —
 *   only `immediate`.
 * - `stop()` keeps the effect registered but the callback becomes a no-op —
 *   observable behavior is identical (the callback never fires again).
 *
 * @example
 * ```ts
 * const [source, setSource] = useState('foo')
 * const { trigger, ignoreUpdates } = useWatchTriggerable(source, v => console.log(`Changed to ${v}!`))
 * setSource('bar') // logs: Changed to bar!
 * ignoreUpdates(() => setSource('foobar')) // (nothing logged)
 * trigger() // logs: Changed to foobar! — fired manually with the current value
 * ```
 */
export function useWatchTriggerable<T extends any[], R>(
  source: readonly [...T],
  callback: UseWatchTriggerableCallback<[...T], UseWatchTriggerableOldValues<[...T]>, R>,
  options?: UseWatchTriggerableOptions,
): UseWatchTriggerableReturn<R>
export function useWatchTriggerable<T, R>(
  source: T,
  callback: UseWatchTriggerableCallback<T, T | undefined, R>,
  options?: UseWatchTriggerableOptions,
): UseWatchTriggerableReturn<R>
export function useWatchTriggerable(source: any, callback: UseWatchTriggerableCallback, options: UseWatchTriggerableOptions = {}): UseWatchTriggerableReturn<any> {
  const { immediate } = options

  // — internal render tick — `ignoreUpdates` may run an updater that changes
  // nothing observable (a no-op `setState` makes React bail out of rendering
  // entirely), and a disarm that depended on a commit would then never run.
  // Bumping this internal state after arming the barrier guarantees a commit,
  // so the disarm effect below always gets a chance to run. The tick is
  // invisible to the caller — it changes no returned value.
  const [, forceCommit] = useState(0)

  // — upstream `onCleanup` plumbing: when a new side effect occurs, clean up
  // the previous side effect (both watch-fired and manual invocations) —
  const cleanupFnRef = useRef<(() => void) | undefined>(undefined)

  const onCleanup = useCallback<OnCleanup>((cleanupFn) => {
    cleanupFnRef.current = cleanupFn
  }, [])

  const triggerableCallback = useCallback((value: any, oldValue: any) => {
    const cleanupFn = cleanupFnRef.current
    if (cleanupFn) {
      cleanupFnRef.current = undefined
      cleanupFn()
    }
    return callback(value, oldValue, onCleanup)
  }, [callback, onCleanup])

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
    triggerableCallback(value, oldValue)
  }, { immediate })

  // Disarm the barrier when a commit carries no source change (the updater
  // produced nothing observable) so it cannot consume a later genuine change.
  // The internal render tick guarantees such a commit even when React would
  // otherwise bail out of rendering entirely.
  useEffect(() => {
    if (ignoreRef.current && isSameSource(source, snapshotRef.current))
      ignoreRef.current = false
  })

  const ignoreUpdates = useCallback<IgnoredUpdater>((updater) => {
    // Snapshot the observed value before the updater runs — the next watch
    // trigger is skipped when it observes a change since this snapshot.
    snapshotRef.current = lastSeenRef.current
    updater()
    ignoreRef.current = true
    // Force a commit so the disarm effect runs even for a no-op updater.
    forceCommit(x => x + 1)
  }, [forceCommit])

  const ignorePrevAsyncUpdates = useCallback(() => {
    // Snapshot-style one-shot skip for the changes queued before this call.
    snapshotRef.current = lastSeenRef.current
    ignoreRef.current = true
    // Force a commit so the disarm effect runs even for a no-op invocation.
    forceCommit(x => x + 1)
  }, [forceCommit])

  const stop = useCallback(() => {
    stoppedRef.current = true
  }, [])

  const trigger = useCallback(() => {
    // Manual invocation wrapped in `ignoreUpdates` exactly like upstream: a
    // source change queued by the callback is suppressed at the next watch
    // fire (upstream counts it in `ignoreCounter`), and a callback that makes
    // no change is disarmed by the forced commit so a later genuine change
    // still fires. The old value is unknown — per-element `undefined` for
    // array sources, `undefined` otherwise (upstream `getOldValue`).
    let result!: any
    ignoreUpdates(() => {
      result = triggerableCallback(source, getOldValue(source))
    })
    return result
  }, [source, triggerableCallback, ignoreUpdates])

  return { trigger, ignoreUpdates, ignorePrevAsyncUpdates, stop }
}

// For calls triggered by `trigger`, the old value is unknown, so it cannot be
// returned — `undefined`, per-element for array sources (upstream
// `getOldValue`).
function getOldValue(source: any) {
  return Array.isArray(source)
    ? source.map(() => undefined)
    : undefined
}

// Element-wise equality for array sources: each render builds a fresh array
// literal, so `Object.is` on the arrays themselves could never match — the
// disarm check compares the values instead.
function isSameSource(a: any, b: any) {
  if (Object.is(a, b))
    return true
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length
    && a.every((item, index) => Object.is(item, b[index]))
}
