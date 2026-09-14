---
category: '@RxJS'
---

# useObservable

Use an RxJS [`Observable`](https://rxjs.dev/guide/observable), return a controllable state, and automatically unsubscribe from it when the component is unmounted.

## Install

```bash
npm i rxjs
```

## Usage

```tsx
import { useObservable } from '@reause/rxjs'
import { interval } from 'rxjs'
import { mapTo, scan, startWith } from 'rxjs/operators'

export function Counter() {
  const [count, setCount] = useObservable(
    interval(1000).pipe(
      mapTo(1),
      startWith(0),
      scan((total, next) => next + total),
    ),
  )

  return (
    <div>
      <p>
        Counter:
        {count}
      </p>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}
```

The state is also writable from React code through the returned setter — the next emission overwrites it again. The subscription is created once on mount and unsubscribed on unmount, so an inline observable (like `interval(1000)` above) is not restarted by re-renders.

### Initial Value

You can provide an initial value that will be used before the Observable emits its first value:

```tsx
import { useObservable } from '@reause/rxjs'
import { interval } from 'rxjs'

const [count, setCount] = useObservable(
  interval(1000),
  { initialValue: 0 },
)
// count is 0 until the first emission
```

### Error Handling

If you want to add custom error handling to an `Observable` that might error, you can supply an optional `onError` configuration. Without this, RxJS will treat any error in the supplied `Observable` as an "unhandled error" and it will be thrown in a new call stack and reported to `window.onerror` (or `process.on('error')` if you happen to be in Node).

```tsx
import { useObservable } from '@reause/rxjs'
import { interval } from 'rxjs'
import { map } from 'rxjs/operators'

const [count, setCount] = useObservable(
  interval(1000).pipe(
    map((n) => {
      if (n === 10)
        throw new Error('oops')

      return n + n
    }),
  ),
  {
    onError: (err) => {
      console.log(err.message) // "oops"
    },
  },
)
```

### Options

| Option         | Type                     | Description                              |
| -------------- | ------------------------ | ---------------------------------------- |
| `initialValue` | `T`                      | Value to use before the Observable emits |
| `onError`      | `(err: unknown) => void` | Error handler for Observable errors      |

## Type Declarations

```ts
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
export declare function useObservable<H, I = undefined>(
  observable: Observable<H>,
  options?: UseObservableOptions<I | undefined>,
): UseObservableReturn<H, I>
```
