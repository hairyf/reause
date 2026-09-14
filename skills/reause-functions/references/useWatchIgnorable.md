---
category: Watch
---

# useWatchIgnorable

Ignorable watch — extended watch that returns `ignoreUpdates(updater)` / `ignorePrevAsyncUpdates()` / `stop` to ignore particular updates to the source

## Usage

```tsx
import { useWatchIgnorable } from '@reause/shared'
import { useState } from 'react'

const [source, setSource] = useState('foo')

const { stop, ignoreUpdates } = useWatchIgnorable(
  source,
  v => console.log(`Changed to ${v}!`),
)

setSource('bar') // logs: Changed to bar!

ignoreUpdates(() => {
  setSource('foobar')
}) // (nothing logged)

setSource('hello') // logs: Changed to hello!
```

> React batches state updates within one event handler, so an ignored update and
> a non-ignored update in the same batch collapse into a single render, which
> the ignore barrier skips as a whole. Let the ignored update's batch commit
> (return from the event handler) before making changes that must fire.

```tsx
ignoreUpdates(() => {
  setSource('ignored')
})

// same batch as the ignored update → collapsed into it and skipped
setSource('logged') // (nothing logged)

// separate batch → the barrier was consumed, so this fires
setSource('after') // logs: Changed to after!
```

## `ignorePrevAsyncUpdates`

`ignorePrevAsyncUpdates()` ignores the changes made since the last time the callback fired — as long as no other changes follow:

```tsx
const { ignorePrevAsyncUpdates } = useWatchIgnorable(
  source,
  v => console.log(`Changed to ${v}!`),
)

setSource('good')
setSource('by')
ignorePrevAsyncUpdates() // (nothing logged for 'by')

setSource('prev')
ignorePrevAsyncUpdates()
setSource('after') // logs: Changed to after!
```

## Options

`useWatchIgnorable` accepts `immediate` (fire the callback once on mount) and `once` (stop the watch after the first fired change; ignored fires do not count). Upstream's `deep`, `flush`, and `eventFilter` watch options are not supported — they are not expressible in React (no reactive graph, no configurable commit, no filter pipeline), and passing them fails type checking.

## Recommended Readings

- [Ignorable Watch](https://patak.dev/vue/ignorable-watch.html) - by [@patak-dev](https://github.com/patak-dev)

## Type Declarations

```ts
export type IgnoredUpdater = (updater: () => void) => void
export type IgnoredPrevAsyncUpdates = () => void
export interface UseWatchIgnorableReturn {
  /**
   * Run `updater`, ignoring the watch for the source changes it makes — as long as no other changes
   * follow, the callback is not fired for that batch.
   */
  ignoreUpdates: IgnoredUpdater
  /**
   * Ignore the source changes made since the last time the callback fired — as long as no other
   * changes follow, the callback is not fired for that batch.
   */
  ignorePrevAsyncUpdates: IgnoredPrevAsyncUpdates
  /**
   * Stop watching — further source changes will not fire the callback.
   */
  stop: () => void
}
export interface UseWatchIgnorableOptions {
  /**
   * Fire the callback once on mount with the current value.
   * @default false
   */
  immediate?: boolean
  /**
   * Stop the watch after the callback has fired once. Ignored fires do not count towards the limit.
   * @default false
   */
  once?: boolean
}
/**
 * Map from @vueuse/shared `watchIgnorable`.
 *
 * @example
 * ```ts
 * const [source, setSource] = useState('foo')
 * const { ignoreUpdates } = useWatchIgnorable(source, v => console.log(`Changed to ${v}!`))
 * setSource('bar') // logs: Changed to bar!
 * ignoreUpdates(() => setSource('foobar')) // (nothing logged)
 * ```
 */
export declare function useWatchIgnorable<T extends any[]>(
  source: readonly [...T],
  callback: UseWatchCallback<[...T]>,
  options?: UseWatchIgnorableOptions,
): UseWatchIgnorableReturn
export declare function useWatchIgnorable<T>(
  source: T,
  callback: UseWatchCallback<T>,
  options?: UseWatchIgnorableOptions,
): UseWatchIgnorableReturn
```
