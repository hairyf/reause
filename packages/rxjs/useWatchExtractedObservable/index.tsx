import type { Observable, Subscription } from 'rxjs'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Register a cleanup callback for the current extractor run. Mirrors Vue's `watch` cleanup hook:
 * the registered callbacks run before the next subscription is created and when the hook is torn
 * down (`stop()` / unmount).
 */
export type OnCleanup = (cleanupFn: () => void) => void

/**
 * Extracts the `Observable` to watch from the resolved source value.
 *
 * Note the parameter list is `(value, onCleanup)` — upstream's extractor also receives Vue's
 * `oldValue` between the two; React has no previous-value tracking for arbitrary sources, so that
 * argument is intentionally absent (see the JSDoc of {@link useWatchExtractedObservable}).
 */
export type WatchExtractedObservableExtractor<Value, E> = (
  value: NonNullable<Value>,
  onCleanup: OnCleanup,
) => Observable<E>

export interface UseWatchExtractedObservableOptions {
  /**
   * Extra React effect dependencies — the React substitute for Vue's reactive tracking (same
   * convention as `useAsync`'s `options.deps`, `packages/core/useAsync/index.tsx`). The resolved
   * source value's identity is always compared as well, so a new source object re-extracts even
   * without `deps`. Defaults to `[]`.
   */
  deps?: unknown[]
  /**
   * Error handler forwarded to the `Observable` subscription. Without it RxJS treats an error as
   * unhandled and rethrows it asynchronously (upstream parity).
   */
  onError?: (err: unknown) => void
  /** Called when the watched `Observable` completes. */
  onComplete?: () => void
}

export interface UseWatchExtractedObservableReturn {
  /**
   * Stop watching: runs the pending `onCleanup` callbacks, unsubscribes the active subscription and
   * detaches the hook permanently (upstream's `WatchHandle`). Idempotent — later `deps` / source
   * changes no longer subscribe.
   */
  stop: () => void
}

/**
 * Shared empty dependency array — a stable identity so the default `deps` never re-creates the
 * effect dependency list.
 */
const EMPTY_DEPS: unknown[] = []

/**
 * Watch the values of an RxJS [`Observable`](https://rxjs.dev/guide/observable) extracted from a
 * source value — React port of VueUse's `watchExtractedObservable`.
 *
 * Map from @vueuse/rxjs `watchExtractedObservable`
 * (`source/vueuse/packages/rxjs/watchExtractedObservable/`): whenever the
 * resolved source value changes, the previous subscription is unsubscribed and `extractor` derives
 * a new `Observable`, whose emissions are forwarded to `callback`. Automatically unsubscribes when
 * the source changes and when the component unmounts.
 *
 * React adaptation (upstream's Vue reactivity graph is replaced):
 *
 * - `value` is a read-only value source and takes a plain `Value | null | undefined`. There is no
 * reactive graph: the effect re-runs when the value's identity changes **or** when `options.deps`
 * change (upstream re-runs whenever the tracked source mutates). A source object mutated **in
 * place** therefore does not re-trigger — pass a new identity or list the mutation inputs in
 * `deps`. `deps` is the React substitute for Vue's reactive tracking, the same convention as
 * `useAsync`'s `options.deps` (`packages/core/useAsync/index.tsx`).
 * - The extractor is `(value, onCleanup) => Observable<E>`: upstream also
 *   passes Vue's `oldValue` as the second argument, which has no React
 *   equivalent (React keeps no previous-value tracking) and is dropped.
 * - Upstream returns a `WatchHandle` function; the React hook returns
 *   `{ stop }` (§2B object return — no state-like writable pair). `stop` is a
 *   stable `useCallback`, idempotent, and — like the `WatchHandle` — permanent:
 *   it tears down the current subscription, runs the pending `onCleanup`
 *   callbacks, and prevents later `deps` / source changes from subscribing
 *   again.
 * - `onCleanup` parity: callbacks registered through the `onCleanup` argument
 *   are collected per run and invoked before the next subscription is created
 *   (upstream's Vue `watch` runs the previous cleanup before the watcher body
 *   unsubscribes) and on unmount / `stop()`. They run before the subscription
 *   is unsubscribed, mirroring upstream's ordering.
 * - A `null` / `undefined` resolved value subscribes to nothing and drops any
 *   previous subscription (upstream parity).
 * - `extractor`, `callback`, `onError` and `onComplete` are read through
 *   latest-value refs, so inline identities never re-subscribe; only the
 *   resolved source value and `deps` do.
 *
 * @see https://vueuse.org/watchExtractedObservable/
 * @example
 * const player = useRef<AudioPlayer | null>(null)
 * const [progress, setProgress] = useState(0)
 *
 * useWatchExtractedObservable(player, p => p.progress$, (percentage) => {
 *   setProgress(percentage * 100)
 * }, { onError: err => console.error(err) })
 */
export function useWatchExtractedObservable<Value, E>(
  value: Value | null | undefined,
  extractor: WatchExtractedObservableExtractor<Value, E>,
  callback: (snapshot: E) => void,
  options?: UseWatchExtractedObservableOptions,
): UseWatchExtractedObservableReturn {
  const {
    deps = EMPTY_DEPS,
    onError,
    onComplete,
  } = options ?? {}

  const resolvedValue = value

  // Latest-input mirrors synced every render (house pattern) so the effect
  // always reads the newest inputs while `effectDeps` stays the only trigger.
  const extractorRef = useRef(extractor)
  extractorRef.current = extractor
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // The active subscription and the teardown of the current effect run are
  // held in refs so the stable `stop` callback can reach them.
  const subscriptionRef = useRef<Subscription | null>(null)
  const teardownRef = useRef<(() => void) | null>(null)
  const stoppedRef = useRef(false)

  const stop = useCallback(() => {
    stoppedRef.current = true
    teardownRef.current?.()
    teardownRef.current = null
  }, [])

  // Resolved source identity first, then the caller's `deps` (built as a
  // variable — never an inline spread in the `useEffect` literal).
  const effectDeps: unknown[] = [resolvedValue, ...deps]

  useEffect(() => {
    // `stop()` is permanent (upstream `WatchHandle`): never re-subscribe.
    if (stoppedRef.current)
      return

    // Upstream 105-116: a nullish value subscribes to nothing. Any previous
    // subscription was already torn down by this effect's cleanup, which React
    // runs before this body because the resolved value is part of `effectDeps`.
    if (resolvedValue === null || resolvedValue === undefined)
      return

    const cleanups: Array<() => void> = []
    let closed = false

    const onCleanup: OnCleanup = (cleanupFn) => {
      cleanups.push(cleanupFn)
    }

    const subscription = extractorRef.current(
      resolvedValue as NonNullable<Value>,
      onCleanup,
    ).subscribe({
      next: snapshot => callbackRef.current(snapshot),
      // The option values are handed to the observer directly (upstream
      // `error: subscriptionOptions?.onError`): an absent `onError` leaves the
      // slot `undefined`, so RxJS treats the error as unhandled and rethrows it
      // asynchronously (`hostReportError`) instead of swallowing it.
      error: onErrorRef.current,
      complete: onCompleteRef.current,
    })

    subscriptionRef.current = subscription

    const teardown = () => {
      // Idempotent: `stop()` and the effect cleanup may both call it.
      if (closed)
        return
      closed = true

      // Registered cleanups run first — upstream's Vue `onCleanup` fires
      // before the watcher body unsubscribes the previous subscription.
      const pending = cleanups.splice(0, cleanups.length)
      pending.forEach(cleanupFn => cleanupFn())

      subscription.unsubscribe()
      if (subscriptionRef.current === subscription)
        subscriptionRef.current = null
    }

    teardownRef.current = teardown

    // Runs on unmount and whenever the resolved value / `deps` change.
    return () => {
      teardown()
      if (teardownRef.current === teardown)
        teardownRef.current = null
    }
  }, effectDeps)

  return { stop }
}
