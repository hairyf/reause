import type { Dispatch, SetStateAction } from 'react'
import type { Subject } from 'rxjs'
import type { UseObservableOptions } from '../useObservable'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BehaviorSubject } from 'rxjs'

/**
 * Options for `useSubject`.
 *
 * Upstream `UseSubjectOptions` is `useObservable`'s options minus `initialValue`: a
 * `BehaviorSubject` seeds the state with its own current value and a plain `Subject` starts out
 * `undefined`, so there is nothing for the caller to supply.
 */
export type UseSubjectOptions<I = undefined> = Omit<UseObservableOptions<I>, 'initialValue'>

/**
 * Return of `useSubject`: a writable `[value, setValue]` tuple (upstream returns a single `Ref<H>`
 * / `Ref<H | undefined>`).
 */
export type UseSubjectReturn<H> = [
  value: H,
  setValue: Dispatch<SetStateAction<H>>,
]

/**
 * Runtime counterpart of the `BehaviorSubject` overload: only a `BehaviorSubject` replays a current
 * value, so only it can seed the state.
 */
function isBehaviorSubject<H>(subject: Subject<H>): subject is BehaviorSubject<H> {
  return subject instanceof BehaviorSubject
}

/**
 * Bind an RxJS [`Subject`](https://rxjs.dev/guide/subject) to a controllable state and propagate
 * value changes both ways.
 *
 * Map from @vueuse/rxjs `useSubject`
 * (`source/vueuse/packages/rxjs/useSubject/`): the state is initialized from a
 * `BehaviorSubject`'s current value (or `undefined` for a plain `Subject`), every emission is
 * written into the state, and writing through the returned setter is pushed back into the subject.
 *
 * React divergences:
 * - upstream returns a `Ref<H>` / `Ref<H | undefined>` that the caller mutates
 *   directly; the React port returns a `useState`-like writable
 *   `[value, setValue]` tuple (hairyf/reause#218).
 * - `setValue` calls `subject.next(...)` — it does **not** set React state
 *   directly. Upstream keeps two writable places (`value.value` and the
 *   subject, bridged by `watch`); here the subject is the single source of
 *   truth, so a write is observable by every other subscriber of the subject
 *   and the exposed value follows the emission that comes back through the
 *   subscription. Unlike upstream's `watch` — which skips an unchanged
 *   primitive — the write is forwarded unconditionally, so `setValue(current)`
 *   still calls `subject.next(current)` and other subscribers see it
 *   (hairyf/reause#218).
 * - the setter accepts a functional update (`useState` parity, hairyf/reause#174);
 *   it is resolved against the latest value seen by the hook, so two functional
 *   updates in the same tick compose instead of both reading the same stale
 *   value.
 * - the effect cleanup: the subscription is created once when the component mounts and unsubscribed
 * on unmount.
 * - the `subject` argument is deliberately **not** an effect dependency — a new
 *   identity on a later render neither re-subscribes (Vue's `tryOnScopeDispose`
 *   also registers exactly once, during `setup`) nor re-targets `setValue`,
 *   which keeps writing into the subject the hook is subscribed to.
 * - `onError` is read when the subscription is created.
 * - SSR-safe: nothing touches `window` / `document`, and the subscription is
 *   only created in the mount effect.
 *
 * @see https://vueuse.org/rxjs/useSubject/
 * @example
 * const subject = new BehaviorSubject('initial')
 * const [value, setValue] = useSubject(subject)
 * // value is 'initial'; setValue('next') pushes 'next' into the subject
 */
export function useSubject<H>(subject: BehaviorSubject<H>, options?: UseSubjectOptions): UseSubjectReturn<H>
export function useSubject<H>(subject: Subject<H>, options?: UseSubjectOptions): UseSubjectReturn<H | undefined>
export function useSubject<H>(subject: Subject<H>, options?: UseSubjectOptions): UseSubjectReturn<H | undefined> {
  const { onError } = options ?? {}

  const [value, setValue] = useState<H | undefined>(
    () => (isBehaviorSubject(subject) ? subject.value : undefined),
  )

  // Latest value known to the hook. It is never rendered — only read to resolve
  // a functional update — so the subject stays the one source of truth.
  const valueRef = useRef<H | undefined>(value)

  // Latest-value ref synced every render (house pattern) so the subscription
  // effect stays stable and never re-subscribes while still reading the newest
  // `onError` when it is created.
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // Captured on the first render and never replaced. Unlike `useObservable`
  // this deliberately is *not* a latest-value ref: `setValue` writes into this
  // exact subject, so re-targeting it on a later render would push values into
  // a subject the hook is not subscribed to and the state would silently stop
  // following the writes.
  const subjectRef = useRef(subject)

  const writeValue = useCallback<Dispatch<SetStateAction<H | undefined>>>((next) => {
    const nextValue = typeof next === 'function'
      ? (next as (previous: H | undefined) => H | undefined)(valueRef.current)
      : next

    // Keep the mirror in step so consecutive functional updates compose the way
    // `useState`'s do before the subject emission lands back in the state.
    valueRef.current = nextValue

    // Upstream `watch(value, nextValue => subject.next(nextValue))`, except the
    // write goes through the subject instead of a second writable place.
    // `undefined` can only reach here through the plain-`Subject` overload,
    // whose `H` is the caller's own (possibly `undefined`-able) type.
    subjectRef.current.next(nextValue as H)
  }, [])

  useEffect(() => {
    const subscription = subjectRef.current.subscribe({
      next: (val: H) => {
        valueRef.current = val
        setValue(val)
      },
      // The option is handed to the observer as-is (upstream
      // `error: options?.onError`): an absent `onError` leaves the slot
      // `undefined`, so RxJS treats the error as unhandled and rethrows it
      // asynchronously (`hostReportError`) instead of swallowing it.
      error: onErrorRef.current,
    })

    // Upstream `tryOnScopeDispose(() => subscription.unsubscribe())`.
    return () => subscription.unsubscribe()
  }, [])

  return [value, writeValue]
}
