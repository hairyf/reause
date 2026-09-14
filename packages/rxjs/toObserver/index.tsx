import type { NextObserver } from 'rxjs'

/**
 * A write sink `toObserver` can push emissions into.
 *
 * - a ref-like object (`{ current }` — `useRef`'s return value, a
 *   `RefObject<T>`, or any hand-written `{ current: T }` holder);
 * - a setter function (`(value: T) => void` — the second tuple member of
 *   `useState`, or a `useReducer` dispatch).
 *
 * Plain values are deliberately NOT accepted: writing to a value is meaningless, so the target is
 * always something that can receive a write.
 */
export type ObserverTarget<T> = { current: T } | ((value: T) => void)

/**
 * Sugar function converting a write sink into an RxJS [Observer](https://rxjs.dev/guide/observer).
 *
 * Map from @vueuse/rxjs `toObserver`
 * (`source/vueuse/packages/rxjs/toObserver/index.ts`). Upstream is
 * `toObserver<T>(value: Ref<T>): NextObserver<T>` — it returns an observer whose only method is
 * `next`, which synchronously writes the emission into `value.value`.
 *
 * React divergences: a `useRef` write never schedules a re-render, so a 1:1 mirror accepting only a
 * Vue-style `Ref` would silently pin consumers to non-rendering state. The reause version therefore
 * accepts either a ref-like object (`{ current }`, written through `.current`) or a setter function
 * (`(value: T) => void`, called directly) — pass a `useState` setter when the UI must update, or a
 * `useRef` when the latest value only needs to be read later. Everything else matches upstream: the
 * returned observer has ONLY `next` (no `error`/`complete`), each emission is written
 * synchronously, and `toObserver` itself has no side effects.
 *
 * The parameter is named `target` (upstream `value`) because it is a write sink, not a value —
 * there is no Vue-style ref object exposed to users.
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const [count, setCount] = useState(0)
 * interval(1000).pipe(take(3)).subscribe(toObserver(setCount)) // re-renders
 *
 * @example
 * const count = useRef(0)
 * interval(1000).pipe(take(3)).subscribe(toObserver(count)) // no re-render
 * count.current // latest emission
 *
 * @param target - A ref-like `{ current }` object or a setter function.
 * @returns An RxJS `NextObserver<T>` whose `next` writes into `target`.
 */
export function toObserver<T>(target: ObserverTarget<T>): NextObserver<T> {
  if (typeof target === 'function')
    return { next: (val: T) => { target(val) } }

  return {
    next: (val: T) => {
      target.current = val
    },
  }
}
