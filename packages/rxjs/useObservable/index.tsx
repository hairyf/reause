import type { Dispatch, SetStateAction } from 'react'
import type { Observable } from 'rxjs'
import { useEffect, useRef, useState } from 'react'

/**
 * Options for `useObservable`.
 */
export interface UseObservableOptions<I> {
  /**
   * Error handler forwarded to the `Observable` subscription. Without it RxJS treats any error in
   * the supplied `Observable` as an "unhandled error": it is rethrown on a new call stack and
   * reported to `window.onerror` (or `process.on('error')`), exactly like upstream.
   */
  onError?: (err: unknown) => void
  /**
   * The value that should be set if the observable has not emitted.
   *
   * @default undefined
   */
  initialValue?: I | undefined
}

/**
 * Return of `useObservable`: a writable `[value, setValue]` tuple (upstream returns a single
 * `Readonly<Ref<H | I>>`).
 */
export type UseObservableReturn<H, I = undefined> = [
  value: H | I,
  setValue: Dispatch<SetStateAction<H | I>>,
]

/**
 * Map from @vueuse/rxjs `useObservable`
 * (`source/vueuse/packages/rxjs/useObservable/`).
 *
 * @see https://vueuse.org/rxjs/useObservable/
 * @example
 * const [count, setCount] = useObservable(interval(1000), { initialValue: 0 })
 * // count is 0 until the first emission
 */
export function useObservable<H, I = undefined>(
  observable: Observable<H>,
  options?: UseObservableOptions<I | undefined>,
): UseObservableReturn<H, I> {
  const { initialValue, onError } = options ?? {}

  const [value, setValue] = useState<H | I>(initialValue as H | I)

  // Latest-value refs synced every render (house pattern) so the subscription
  // effect stays stable and never re-subscribes while still reading the newest
  // inputs when it is created.
  const observableRef = useRef(observable)
  observableRef.current = observable
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    const subscription = observableRef.current.subscribe({
      next: (val: H) => setValue(val),
      // The option is handed to the observer as-is (upstream
      // `error: options?.onError`): an absent `onError` leaves the slot
      // `undefined`, so RxJS treats the error as unhandled and rethrows it
      // asynchronously (`hostReportError`) instead of swallowing it.
      error: onErrorRef.current,
    })

    // Upstream `tryOnScopeDispose(() => subscription.unsubscribe())`.
    return () => subscription.unsubscribe()
  }, [])

  return [value, setValue]
}
