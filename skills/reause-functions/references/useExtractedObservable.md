---
category: '@RxJS'
---

# useExtractedObservable

Use an RxJS [`Observable`](https://rxjs.dev/guide/observable) as extracted from one or more hooks, return the latest emitted value, and automatically unsubscribe from it when the component is unmounted.

Automatically unsubscribe on observable change, and automatically unsubscribe from it when the component is unmounted.

The source is a plain value, so the extractor re-runs when its identity changes; `deps` covers a source that is mutated in place.

## Install

```bash
npm i rxjs
```

## Usage

```tsx
import { useExtractedObservable } from '@reause/rxjs'
import { useState } from 'react'
import { interval } from 'rxjs'
import { mapTo, scan, startWith } from 'rxjs/operators'

export function Counter() {
  const [start, setStart] = useState(0)

  const count = useExtractedObservable(start, start => interval(1000).pipe(
    mapTo(1),
    startWith(start),
    scan((total, next) => next + total),
  ))

  return (
    <div>
      <p>
        Counter:
        {count}
      </p>
      <button onClick={() => setStart(0)}>Restart from 0</button>
    </div>
  )
}
```

The subscription is created in an effect: it is unsubscribed whenever the source value changes, and on unmount. Upstream's `watch` options have no React equivalent — the extractor always runs on mount (upstream's `immediate: true` default), and a source object mutated in place is re-extracted by listing the mutation inputs in `deps`:

```tsx
import { useExtractedObservable } from '@reause/rxjs'
import { useState } from 'react'
import { of } from 'rxjs'

const [filters, setFilters] = useState({ status: 'open', limit: 10 })

const label = useExtractedObservable(
  filters,
  filters => of(`${filters.status}: ${filters.limit}`),
  { deps: [filters.status, filters.limit] },
)
```

If you want to add custom error handling to an `Observable` that might error, you can supply an optional `onError` configuration. Without this, RxJS will treat any error in the supplied `Observable` as an "unhandled error" and it will be thrown in a new call stack and reported to `window.onerror` (or `process.on('error')` if you happen to be in Node).

```tsx
import { useExtractedObservable } from '@reause/rxjs'
import { useState } from 'react'
import { interval } from 'rxjs'
import { mapTo, scan, startWith, tap } from 'rxjs/operators'

const [start, setStart] = useState(0)

const count = useExtractedObservable(
  start,
  (start) => {
    return interval(1000).pipe(
      mapTo(1),
      startWith(start),
      scan((total, next) => next + total),
      tap((n) => {
        if (n === 10)
          throw new Error('oops')
      }),
    )
  },
  {
    onError: (err: unknown) => {
      console.log(err) // Error: oops
    },
  },
)
```

You can also supply an optional `onComplete` configuration if you need to attach special behavior when the watched observable completes.

```tsx
import { useExtractedObservable } from '@reause/rxjs'
import { useState } from 'react'
import { interval } from 'rxjs'
import { mapTo, scan, startWith, takeWhile } from 'rxjs/operators'

const [start, setStart] = useState(0)

const count = useExtractedObservable(
  start,
  (start) => {
    return interval(1000).pipe(
      mapTo(1),
      startWith(start),
      scan((total, next) => next + total),
      takeWhile(num => num < 10),
    )
  },
  {
    initialValue: 0,
    onComplete: () => {
      console.log('Done!')
    },
  },
)
```

## Options

| Option         | Type                     | Description                              |
| -------------- | ------------------------ | ---------------------------------------- |
| `initialValue` | `T`                      | Value to use before the Observable emits |
| `onError`      | `(err: unknown) => void` | Error handler for Observable errors      |
| `onComplete`   | `() => void`             | Called when the Observable completes     |
| `deps`         | `unknown[]`              | Extra dependencies that re-extract       |

## Return Value

Returns the latest value emitted by the extracted Observable — a plain value instead of upstream's readonly `ShallowRef`:

```tsx
const count = useExtractedObservable(start, start => interval(1000).pipe(
  startWith(start),
  scan((total, next) => next + total),
))

// `undefined` until the first emission, unless `initialValue` was provided
console.log(count)
```

## Type Declarations

```ts
/**
 * Options for `useExtractedObservable`.
 *
 * Upstream `UseExtractedObservableOptions` extends `UseObservableOptions` with `onComplete`; the
 * React port reuses the same option names (`onError`, `initialValue`) from `useObservable` and adds
 * `deps`, the substitute for Vue's reactive tracking (see {@link useExtractedObservable}).
 */
export interface UseExtractedObservableOptions<
  E,
> extends UseObservableOptions<E> {
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
export declare function useExtractedObservable<Value, E, I = undefined>(
  value: Value | null | undefined,
  extractor: ExtractedObservableExtractor<Value, E>,
  options?: UseExtractedObservableOptions<E | I>,
): E | I
```
