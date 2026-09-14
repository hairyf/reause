---
category: '@RxJS'
---

# useFrom

Create an [`Observable`](https://rxjs.dev/guide/observable) from an rxjs `ObservableInput` — passed straight to RxJS's [`from()`](https://rxjs.dev/api/index/function/from) — or from a plain value that re-emits whenever it changes across renders.

## Install

```bash
npm i rxjs
```

## Usage

```tsx
import { useFrom, useObservable } from '@reause/rxjs'
import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)

  // emits 0 immediately, then re-emits whenever `count` changes
  const count$ = useFrom(count)
  const [display] = useObservable(count$, { initialValue: 0 })

  return (
    <div>
      <p>
        count$ is:
        {display}
      </p>
      <button onClick={() => setCount(value => value + 1)}>increment</button>
    </div>
  )
}
```

The returned `Observable` has a stable identity across renders, so downstream subscriptions are not rebuilt by re-renders. On unmount the underlying subject is completed — subscriptions stop and no further emissions are delivered.

### ObservableInput

Passing an rxjs `ObservableInput` — an `Observable`, `Subject`, `BehaviorSubject`, `Promise`, iterable, etc. — forwards it to rxjs `from()` unchanged (upstream parity):

```tsx
import { useFrom } from '@reause/rxjs'
import { fromEvent } from 'rxjs'

const clicks$ = useFrom(fromEvent(document, 'click'))
```

### Plain value

Any other value is wrapped in a `BehaviorSubject` seeded with the current render value: subscribing immediately receives the current value, and the `Observable` re-emits whenever the value changes across renders.

```tsx
import { useFrom, useSubscription } from '@reause/rxjs'
import { useState } from 'react'

const [count, setCount] = useState(0)
const count$ = useFrom(count)

useSubscription(count$.subscribe((value) => {
  console.log(value)
}))
```

Only plain values are accepted — never a getter, `State<T>` or a React ref.

## React divergences from upstream

- upstream's `Ref<T>` branch becomes the plain-value re-emit branch: React has no reactive refs, so the port takes a plain value and pushes changes through an internal effect instead of a `watch`.
- upstream's `WatchOptions` (`immediate` / `deep` / `flush`) is dropped — React has no Vue `watch`. `immediate` is covered by subscribing-receives-current-value (the seeded `BehaviorSubject`); `deep` and `flush` are not mapped — handle extra control at the call site with rxjs operators or effect dependencies.
- the hook is named `useFrom` (not `from`) to avoid colliding with rxjs's own `from` export.
- upstream's `fromEvent` (the second export of the same upstream module) is not part of this mapping.

## Type Declarations

```ts
/**
 * Create an [`Observable`](https://rxjs.dev/guide/observable) from either an
 * rxjs `ObservableInput` (forwarded to RxJS's
 * [`from()`](https://rxjs.dev/api/index/function/from) unchanged) or a plain
 * value that re-emits whenever it changes across renders.
 *
 * Map from @vueuse/rxjs `from`
 * (`source/vueuse/packages/rxjs/from/`): upstream branches on Vue's `isRef`
 * and `watch`es the ref; React has no reactive refs, so the port branches on
 * observable-/promise-likeness and pushes plain values through an internal
 * effect instead.
 *
 * Branch discriminator (runtime):
 * - a value with a `subscribe` function (Observable-like) or a `then` function
 *   (Promise-like) is passed straight to rxjs `from(value)` — upstream parity.
 * - any other plain value is wrapped in a `BehaviorSubject` seeded with the
 *   current render value: subscribing immediately receives the current value
 *   (the mapped `immediate` semantics), and the Observable re-emits whenever
 *   the value changes across renders.
 *
 * React divergences:
 * - upstream's `Ref<T>` branch becomes the plain-value re-emit branch. The
 *   subject and its `asObservable()` wrapper are held in refs, so the returned
 *   Observable keeps a stable identity across renders and downstream
 *   subscriptions are not rebuilt by re-renders.
 * - upstream's `WatchOptions` (`immediate` / `deep` / `flush`) is dropped —
 *   React has no Vue `watch`. `immediate` is covered by the seeded
 *   `BehaviorSubject` (subscribing receives the current value immediately);
 *   `deep` / `flush` are not mapped — handle extra control at the call site
 *   with rxjs operators or effect dependencies.
 * - the value source is a plain `T` only — never a getter, `State<T>` or
 *   `MaybeRefOrGetter` (AGENTS.md §2).
 * - on unmount the subject is completed: subscriptions stop and no further
 *   emissions are delivered. In dev, React StrictMode remounts effects and
 *   runs that cleanup, which completes the subject; the mount effect detects
 *   the stopped subject and reseeds it, so re-emission survives the simulated
 *   unmount/remount cycle.
 *
 * @see https://vueuse.org/rxjs/from/
 * @example
 * const [count, setCount] = useState(0)
 * const count$ = useFrom(count)
 * // count$ emits 0 immediately; setCount(1) re-emits 1
 * @example
 * const values$ = useFrom(of(1, 2)) // ObservableInput: rxjs from() passthrough
 */
export declare function useFrom<T>(value: ObservableInput<T> | T): Observable<T>
```
