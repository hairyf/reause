---
category: '@RxJS'
---

# useWatchExtractedObservable

Watch the values of an RxJS [`Observable`](https://rxjs.dev/guide/observable) as extracted from one or more hooks.

Automatically unsubscribe on observable change, and automatically unsubscribe from it when the component is unmounted.

## Usage

```tsx
import type { Observable } from 'rxjs'
import { useWatchExtractedObservable } from '@reause/rxjs'
import { useState } from 'react'
import { Subject } from 'rxjs'

interface Player {
  progress$: Observable<number>
}

export function PlayerProgress() {
  const [player] = useState<Player>(() => ({ progress$: new Subject<number>() }))
  const [progress, setProgress] = useState(0)

  const { stop } = useWatchExtractedObservable(player, p => p.progress$, setProgress)

  return (
    <div>
      <p>{progress}</p>
      <button onClick={() => stop()}>Stop watching</button>
    </div>
  )
}
```

If you want to add custom error handling to an `Observable` that might error, you can supply an optional `onError` configuration. Without this, RxJS will treat any error in the supplied `Observable` as an "unhandled error" and it will be thrown in a new call stack and reported to `window.onerror` (or `process.on('error')` if you happen to be in Node).

You can also supply an optional `onComplete` configuration if you need to attach special behavior when the watched observable completes.

```tsx
useWatchExtractedObservable(player, p => p.progress$, setProgress, {
  onError: (err: unknown) => {
    console.error(err)
  },
  onComplete: () => {
    setProgress(100) // or 0, or whatever
  },
})
```

## Subscription Options

| Option       | Type                     | Description                          |
| ------------ | ------------------------ | ------------------------------------ |
| `onError`    | `(err: unknown) => void` | Error handler for Observable errors  |
| `onComplete` | `() => void`             | Called when the Observable completes |

## Return Value

Returns a `WatchHandle` that can be used to stop watching:

```tsx
const { stop } = useWatchExtractedObservable(player, p => p.progress$, setProgress)

// Later, stop watching
stop()
```

## Type Declarations

```ts
/**
 * Register a cleanup callback for the current extractor run. Mirrors Vue's `watch` cleanup hook:
 * the registered callbacks run before the next subscription is created and when the hook is torn
 * down (`stop()` / unmount).
 */
export type OnCleanup = (cleanupFn: () => void) => void
/**
 * Extracts the `Observable` to watch from the resolved source value.
 *
 * Note the parameter list is `(value, onCleanup)` — upstream's extractor also receives Vue's
 * `oldValue` between the two; React has no previous-value tracking for arbitrary sources, so that
 * argument is intentionally absent (see the JSDoc of {@link useWatchExtractedObservable}).
 */
export type WatchExtractedObservableExtractor<Value, E> = (
  value: NonNullable<Value>,
  onCleanup: OnCleanup,
) => Observable<E>
export interface UseWatchExtractedObservableOptions {
  /**
   * Extra React effect dependencies — the React substitute for Vue's reactive tracking (same
   * convention as `useAsync`'s `options.deps`, `packages/core/useAsync/index.tsx`). The resolved
   * source value's identity is always compared as well, so a new source object re-extracts even
   * without `deps`. Defaults to `[]`.
   */
  deps?: unknown[]
  /**
   * Error handler forwarded to the `Observable` subscription. Without it RxJS treats an error as
   * unhandled and rethrows it asynchronously (upstream parity).
   */
  onError?: (err: unknown) => void
  /** Called when the watched `Observable` completes. */
  onComplete?: () => void
}
export interface UseWatchExtractedObservableReturn {
  /**
   * Stop watching: runs the pending `onCleanup` callbacks, unsubscribes the active subscription and
   * detaches the hook permanently (upstream's `WatchHandle`). Idempotent — later `deps` / source
   * changes no longer subscribe.
   */
  stop: () => void
}
/**
 * Map from @vueuse/rxjs `watchExtractedObservable`
 * (`source/vueuse/packages/rxjs/watchExtractedObservable/`).
 *
 * @see https://vueuse.org/watchExtractedObservable/
 * @example
 * const player = useRef<AudioPlayer | null>(null)
 * const [progress, setProgress] = useState(0)
 *
 * useWatchExtractedObservable(player, p => p.progress$, (percentage) => {
 *   setProgress(percentage * 100)
 * }, { onError: err => console.error(err) })
 */
export declare function useWatchExtractedObservable<Value, E>(
  value: Value | null | undefined,
  extractor: WatchExtractedObservableExtractor<Value, E>,
  callback: (snapshot: E) => void,
  options?: UseWatchExtractedObservableOptions,
): UseWatchExtractedObservableReturn
```
