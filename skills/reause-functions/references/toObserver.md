---
category: '@RxJS'
---

# toObserver

Sugar function to convert a ref object (`RefObject`) or a setter function into an RxJS [Observer](https://rxjs.dev/guide/observer) — a `useRef` write does not re-render.

## Usage

```tsx
import { toObserver } from '@reause/rxjs'
import { useRef, useState } from 'react'
import { interval } from 'rxjs'
import { take } from 'rxjs/operators'

const [count, setCount] = useState(0)
const countRef = useRef(0)

interval(1000).pipe(take(5)).subscribe(toObserver(setCount)) // same as ).subscribe(val => setCount(val)) — re-renders
interval(1000).pipe(take(5)).subscribe(toObserver(countRef)) // same as ).subscribe(val => (countRef.current = val)) — no re-render
```

## Type Declarations

```ts
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
export type ObserverTarget<T> =
  | {
      current: T
    }
  | ((value: T) => void)
/**
 * Map from @vueuse/rxjs `toObserver`
 * (`source/vueuse/packages/rxjs/toObserver/index.ts`).
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
export declare function toObserver<T>(
  target: ObserverTarget<T>,
): NextObserver<T>
```
