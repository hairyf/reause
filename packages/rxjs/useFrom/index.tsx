import type { Observable, ObservableInput } from 'rxjs'
import { useEffect, useRef } from 'react'
import { BehaviorSubject, from } from 'rxjs'

/**
 * Observable-like: an object or function exposing a `subscribe` method (an rxjs `Observable`,
 * `Subject`, `BehaviorSubject`...).
 */
function isObservableLike(value: unknown): boolean {
  return value !== null
    && (typeof value === 'object' || typeof value === 'function')
    && typeof (value as { subscribe?: unknown }).subscribe === 'function'
}

/**
 * Promise-like: an object or function exposing a `then` method.
 */
function isPromiseLike(value: unknown): boolean {
  return value !== null
    && (typeof value === 'object' || typeof value === 'function')
    && typeof (value as { then?: unknown }).then === 'function'
}

/**
 * Map from @vueuse/rxjs `from`
 * (`source/vueuse/packages/rxjs/from/`).
 *
 * @see https://vueuse.org/rxjs/from/
 * @example
 * const [count, setCount] = useState(0)
 * const count$ = useFrom(count)
 * // count$ emits 0 immediately; setCount(1) re-emits 1
 * @example
 * const values$ = useFrom(of(1, 2)) // ObservableInput: rxjs from() passthrough
 */
export function useFrom<T>(value: ObservableInput<T> | T): Observable<T> {
  // Plain-value branch machinery, created unconditionally so the hooks keep a
  // stable order even when the branch flips between renders. In the
  // ObservableInput branch the subject is never returned and stays unobserved.
  const subjectRef = useRef<BehaviorSubject<T> | null>(null)
  if (subjectRef.current === null)
    subjectRef.current = new BehaviorSubject(value as T)
  const subject = subjectRef.current

  // `asObservable()` builds a fresh wrapper per call, so the wrapper is cached
  // to give the returned Observable a stable identity across renders.
  const observableRef = useRef<Observable<T> | null>(null)
  if (observableRef.current === null)
    observableRef.current = subject.asObservable()
  const observable = observableRef.current

  // Latest rendered value — read by the mount effect when it reseeds the
  // subject after a StrictMode remount.
  const valueRef = useRef(value)
  valueRef.current = value

  // Previous pushed value. The seed already delivers the current value, so
  // pushing only on changes avoids a duplicate first emission.
  const prevValueRef = useRef(value)

  useEffect(() => {
    const subject = subjectRef.current
    if (subject === null)
      return

    // React StrictMode (dev) mounts effects twice: the cleanup below completes
    // the subject on the simulated unmount, so reseed on the remount to keep
    // plain-value re-emission alive (rxjs@6: `complete()` stops the subject —
    // `next()` after that is silently dropped).
    if (subject.isStopped) {
      const nextSubject = new BehaviorSubject(valueRef.current as T)
      subjectRef.current = nextSubject
      observableRef.current = nextSubject.asObservable()
      return () => nextSubject.complete()
    }

    return () => subject.complete()
  }, [])

  useEffect(() => {
    const subject = subjectRef.current
    if (subject === null || subject.isStopped)
      return

    const previous = prevValueRef.current
    prevValueRef.current = value
    if (!Object.is(previous, value))
      subject.next(value as T)
  }, [value])

  // Observable-like / Promise-like → upstream parity: rxjs `from(value)`.
  if (isObservableLike(value) || isPromiseLike(value))
    return from(value as ObservableInput<T>)

  return observable
}
