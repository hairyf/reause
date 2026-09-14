---
category: Watch
---

# useWatchPausable

Pausable watch — pause and resume a watched value's updates

## Usage

Watch your own state value; the returned controls carry extra `pause()` and
`resume()` functions to control the callback.

```tsx
import { useWatchPausable } from '@reause/shared'
import { useState } from 'react'

const [value, setValue] = useState('foo')
const { pause, resume, stop } = useWatchPausable(
  value,
  v => console.log(`Changed to ${v}!`),
)

setValue('bar') // logs: Changed to bar!

pause()

setValue('foobar') // (nothing logged — the change is dropped while paused)

resume()

setValue('hello') // logs: Changed to hello!
```

Start paused and fire once on mount with `initialState` / `immediate`:

```tsx
import { useWatchPausable } from '@reause/shared'
import { useState } from 'react'

const [value, setValue] = useState('foo')
const { isActive } = useWatchPausable(
  value,
  v => console.log(`Changed to ${v}!`),
  { initialState: 'paused' },
)
```

### Options

| Option         | Type                   | Default    | Description                                            |
| -------------- | ---------------------- | ---------- | ------------------------------------------------------ |
| `initialState` | `'active' \| 'paused'` | `'active'` | The initial state of the watcher                       |
| `immediate`    | `boolean`              | `false`    | Fire the callback once on mount with the current value |

## Type Declarations

```ts
export interface UseWatchPausableOptions {
  /**
   * The initial state of the watcher.
   *
   * @default 'active'
   */
  initialState?: "active" | "paused"
  /**
   * Fire the callback once on mount with the current source value (still subject to the pause
   * state).
   *
   * @default false
   */
  immediate?: boolean
}
export interface UseWatchPausableReturn {
  /**
   * Pause the watcher — source changes will not fire the callback while paused. Changes made while
   * paused are dropped.
   */
  pause: () => void
  /**
   * Resume the watcher — re-activates the callback for future changes. It does not replay changes
   * made while paused.
   */
  resume: () => void
  /**
   * Whether the watcher is currently active.
   */
  isActive: boolean
  /**
   * Stop the watcher — the callback never fires again.
   */
  stop: () => void
}
/**
 * Map from @vueuse/shared `watchPausable`.
 *
 * @example
 * ```ts
 * const [source, setSource] = useState('foo')
 * const { pause, resume } = useWatchPausable(source, v => console.log(`Changed to ${v}!`))
 * setSource('bar') // logs: Changed to bar!
 * pause()
 * setSource('foobar') // (nothing logged)
 * resume()
 * setSource('hello') // logs: Changed to hello!
 * ```
 */
export declare function useWatchPausable<T extends any[]>(
  source: readonly [...T],
  callback: UseWatchCallback<[...T]>,
  options?: UseWatchPausableOptions,
): UseWatchPausableReturn
export declare function useWatchPausable<T>(
  source: T,
  callback: UseWatchCallback<NoInfer<T>>,
  options?: UseWatchPausableOptions,
): UseWatchPausableReturn
```
