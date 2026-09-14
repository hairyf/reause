import type { Observable } from 'rxjs'
import type { UseObservableOptions } from '../useObservable'
import type { OnCleanup } from '../useWatchExtractedObservable'
import { useEffect, useRef, useState } from 'react'

/**
 * Options for `useExtractedObservable`.
 *
 * Upstream `UseExtractedObservableOptions` extends `UseObservableOptions` with `onComplete`; the
 * React port reuses the same option names (`onError`, `initialValue`) from `useObservable` and adds
 * `deps`, the substitute for Vue's reactive tracking (see {@link useExtractedObservable}).
 */
export interface UseExtractedObservableOptions<E> extends UseObservableOptions<E> {
  /** Called when the extracted `Observable` completes. */
  onComplete?: () => void
  /**
   * Extra React effect dependencies — the React substitute for Vue's reactive tracking (same
   * convention as `useAsync`'s `options.deps`, `packages/core/useAsync/index.tsx`). The resolved
   * source value's identity is always compared as well, so a new source object re-extracts even
   * without `deps`. Defaults to `[]`.
   */
  deps?: unknown[]
}

/**
 * Extracts the `Observable` to subscribe to from the resolved source value.
 *
 * Note the parameter list is `(value, onCleanup)` — upstream's extractor also receives Vue's
 * `oldValue` between the two; React has no previous-value tracking for arbitrary sources, so that
 * argument is intentionally absent (see the JSDoc of {@link useExtractedObservable}). The signature
 * is shared with the sibling `useWatchExtractedObservable`
 * (`packages/rxjs/useWatchExtractedObservable/index.tsx`).
 */
export type ExtractedObservableExtractor<Value, E> = (
  value: NonNullable<Value>,
  onCleanup: OnCleanup,
) => Observable<E>

/**
 * Shared empty dependency array — a stable identity so the default `deps` never re-creates the
 * effect dependency list.
 */
const EMPTY_DEPS: unknown[] = []

/**
 * Use an RxJS [`Observable`](https://rxjs.dev/guide/observable) as extracted from one or more
 * hooks, and automatically unsubscribe from it when the component is unmounted.
 *
 * Map from @vueuse/rxjs `useExtractedObservable`
 * (`source/vueuse/packages/rxjs/useExtractedObservable/`): whenever the
 * resolved source value changes, the previous subscription is unsubscribed and `extractor` derives
 * a new `Observable` from the new value, whose emissions become the hook's value. Unsubscribing
 * happens both on a source change and on unmount.
 *
 * React adaptation (upstream's Vue reactivity graph is replaced):
 *
 * - `value` is a read-only value source and takes a plain `Value | null | undefined`. Resolve a
 * React ref or getter at the call site; a list of sources is passed as a plain array and
 * re-extracts when a new array identity arrives. There is no reactive graph: the effect re-runs
 * when the value's identity changes **or** when `options.deps` change (upstream re-runs whenever
 * any tracked source mutates), so a source object mutated **in place** needs a new identity or the
 * mutation inputs listed in `deps`.
 * - the extractor is `(value, onCleanup) => Observable<E>`: upstream also
 *   passes Vue's `oldValue` as the second argument, which has no React
 *   equivalent (React keeps no previous-value tracking) and is dropped.
 * - upstream returns a `DeepReadonly<ShallowRef<E>>`; the React port returns
 *   the value directly (a readonly ref holds no writable value, so the
 *   structure is mirrored — §2 return rules). `initialValue` narrows the
 *   returned type to `E | I` (`I` being the `initialValue` type and
 *   defaulting to `undefined`), the same trick as `useObservable`.
 * - upstream's `watch` options (`immediate` / `deep` / `flush`) are dropped:
 *   the effect always extracts on mount (`immediate: true`, upstream's
 *   default) and re-extracts on identity / `deps` changes — React has no
 *   flush scheduler to configure. Pass `initialValue` to seed the value
 *   before the first extraction settles.
 * - `initialValue` is the `useState` initial value, so it only applies to the
 *   first render — a later source change keeps the last emitted value
 *   (upstream's `obsRef` is never reset either), and a nullish source
 *   subscribes to nothing and drops the previous subscription.
 * - `onCleanup` parity: callbacks registered through the `onCleanup` argument
 *   are collected per run and invoked before the next subscription is created,
 *   before the previous subscription is unsubscribed (upstream's Vue `watch`
 *   runs the previous cleanup before the watcher body), and on unmount.
 * - `extractor`, `onError` and `onComplete` are read through latest-value refs,
 *   so inline identities never re-subscribe; only the resolved source value
 *   and `deps` do.
 * - the option values are handed to the observer directly, so an absent
 *   `onError` leaves the error slot `undefined` and RxJS reports the error as
 *   unhandled instead of swallowing it (upstream parity).
 * - SSR-safe: nothing touches `window` / `document`, and the subscription only
 *   exists inside the mount effect.
 *
 * @see https://vueuse.org/rxjs/useExtractedObservable/
 * @example
 * const [start, setStart] = useState(0)
 * const count = useExtractedObservable(start, start => interval(1000).pipe(
 *   startWith(start),
 *   scan((total, next) => next + total),
 * ), { initialValue: 0 })
 * // count is 0 until the first emission, then keeps accumulating
 */
export function useExtractedObservable<Value, E, I = undefined>(
  value: Value | null | undefined,
  extractor: ExtractedObservableExtractor<Value, E>,
  options?: UseExtractedObservableOptions<E | I>,
): E | I {
  const { initialValue, onError, onComplete, deps = EMPTY_DEPS } = options ?? {}

  const [state, setState] = useState<E | I>(initialValue as E | I)

  const resolvedValue = value

  // Latest-input mirrors synced every render (house pattern) so the effect
  // always reads the newest inputs while `effectDeps` stays the only trigger.
  const extractorRef = useRef(extractor)
  extractorRef.current = extractor
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  // Resolved source identity first, then the caller's `deps` (built as a
  // variable — never an inline spread in the `useEffect` literal).
  const effectDeps: unknown[] = [resolvedValue, ...deps]

  useEffect(() => {
    // Upstream: a nullish value subscribes to nothing. Any previous
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
      // Wrapped in an updater so a function-typed emission is stored as a
      // value instead of being mistaken for a `useState` updater (upstream's
      // `shallowRef` accepts any value).
      next: (val: E) => setState(() => val),
      // The option values are handed to the observer directly (upstream
      // `error: options?.onError`): an absent `onError` leaves the slot
      // `undefined`, so RxJS treats the error as unhandled and rethrows it
      // asynchronously (`hostReportError`) instead of swallowing it.
      error: onErrorRef.current,
      complete: onCompleteRef.current,
    })

    // Runs on unmount and whenever the resolved value / `deps` change.
    // Upstream `tryOnScopeDispose` plus the `subscription?.unsubscribe()` at
    // the top of its watcher body.
    return () => {
      // Idempotent: a torn-down run is only closed once.
      if (closed)
        return
      closed = true

      // Registered cleanups run first — upstream's Vue `onCleanup` fires
      // before the watcher body unsubscribes the previous subscription.
      const pending = cleanups.splice(0, cleanups.length)
      pending.forEach(cleanupFn => cleanupFn())

      // RxJS drops any emission that arrives after `unsubscribe()` (the
      // subscriber is closed), so a torn-down run can never write a stale
      // value into the state.
      subscription.unsubscribe()
    }
  }, effectDeps)

  return state
}
