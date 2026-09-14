---
category: Watch
---

# useWatchTriggerable

Watch that can be triggered manually

## Usage

A `watch` wrapper that supports manual triggering of `WatchCallback`, which returns an additional `trigger` to execute a `WatchCallback` immediately.

```tsx
import { useWatchTriggerable } from '@reause/shared'
import { useState } from 'react'

const [source, setSource] = useState(0)

const { trigger, ignoreUpdates } = useWatchTriggerable(
  source,
  v => console.log(`Changed to ${v}!`),
)

setSource(1) // logs (after commit): Changed to 1!

// Execution of WatchCallback via `trigger` does not require waiting
trigger() // logs: Changed to 1!
```

### `onCleanup`

When you want to manually call a `watch` that uses the onCleanup parameter; simply taking the `WatchCallback` out and calling it doesn't make it easy to implement the `onCleanup` parameter.

Using `useWatchTriggerable` will solve this problem.

```tsx
import { useWatchTriggerable } from '@reause/shared'
import { useState } from 'react'

const [source, setSource] = useState(0)

const { trigger } = useWatchTriggerable(
  source,
  async (v, _, onCleanup) => {
    let canceled = false
    onCleanup(() => canceled = true)

    await new Promise(resolve => setTimeout(resolve, 500))
    if (canceled)
      return

    console.log(`The value is "${v}"\n`)
  },
)

setSource(1) // no log
await trigger() // logs (after 500 ms): The value is "1"
```

## Type Declarations

```ts
export type OnCleanup = (cleanupFn: () => void) => void
export interface UseWatchTriggerableCallback<V = any, OV = any, R = void> {
  (value: V, oldValue: OV, onCleanup: OnCleanup): R
}
/** Per-element optional old value for array sources (upstream `MapOldSources<T, true>`). */
export type UseWatchTriggerableOldValues<T extends readonly any[]> = {
  [K in keyof T]: T[K] | undefined
}
export interface UseWatchTriggerableReturn<R = void> {
  /**
   * Execute the callback immediately with the current source value — the old value is unknown
   * (`undefined`, per-element for array sources) for a manual call, and the invocation does not
   * count as a source change: a source change queued inside the callback is itself ignored.
   */
  trigger: () => R
  /**
   * Run `updater`, ignoring the watch for the source changes it makes — as long as no other changes
   * follow, the callback is not fired for that batch.
   */
  ignoreUpdates: IgnoredUpdater
  /**
   * Ignore the source changes made since the last time the callback fired — as long as no other
   * changes follow, the callback is not fired for that batch.
   */
  ignorePrevAsyncUpdates: () => void
  /**
   * Stop watching — further source changes will not fire the callback.
   */
  stop: () => void
}
export interface UseWatchTriggerableOptions {
  /**
   * Fire the callback once on mount with the current value.
   * @default false
   */
  immediate?: boolean
}
/**
 * Map from @vueuse/shared `watchTriggerable`.
 *
 * @example
 * ```ts
 * const [source, setSource] = useState('foo')
 * const { trigger, ignoreUpdates } = useWatchTriggerable(source, v => console.log(`Changed to ${v}!`))
 * setSource('bar') // logs: Changed to bar!
 * ignoreUpdates(() => setSource('foobar')) // (nothing logged)
 * trigger() // logs: Changed to foobar! — fired manually with the current value
 * ```
 */
export declare function useWatchTriggerable<T extends any[], R>(
  source: readonly [...T],
  callback: UseWatchTriggerableCallback<
    [...T],
    UseWatchTriggerableOldValues<[...T]>,
    R
  >,
  options?: UseWatchTriggerableOptions,
): UseWatchTriggerableReturn<R>
export declare function useWatchTriggerable<T, R>(
  source: T,
  callback: UseWatchTriggerableCallback<T, T | undefined, R>,
  options?: UseWatchTriggerableOptions,
): UseWatchTriggerableReturn<R>
```
