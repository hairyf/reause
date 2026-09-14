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
 * Map from @vueuse/rxjs `useExtractedObservable`
 * (`source/vueuse/packages/rxjs/useExtractedObservable/`).
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
