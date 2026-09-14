---
category: Animation
---

# useInterval

Reactive counter that increases on every interval.

## Usage

```tsx
import { useInterval } from '@reause/shared'

// count will increase every 200ms
const counter = useInterval(200)
```

### With Controls

```tsx
import { useInterval } from '@reause/shared'

const { counter, reset, pause, resume, isActive } = useInterval(200, {
  controls: true,
})

// Reset counter to 0
reset()

// Pause/resume the interval
pause()
resume()
```

### Options

| Option      | Type                      | Default | Description                                                |
| ----------- | ------------------------- | ------- | ---------------------------------------------------------- |
| `controls`  | `boolean`                 | `false` | Expose `pause`, `resume`, `reset`, and `isActive` controls |
| `immediate` | `boolean`                 | `true`  | Start the interval immediately                             |
| `callback`  | `(count: number) => void` | —       | Called on every interval with the current count            |

### Reactive Interval

The interval can be reactive:

```tsx
import { useInterval } from '@reause/shared'
import { useState } from 'react'

const [intervalMs, setIntervalMs] = useState(1000)
const counter = useInterval(intervalMs)

// Change the interval dynamically (restarts the running timer)
setIntervalMs(500)
```

### Callback on Every Interval

```tsx
import { useInterval } from '@reause/shared'

useInterval(1000, {
  callback: (count) => {
    console.log(`Tick ${count}`)
  },
})
```

## Type Declarations

```ts
export interface UseIntervalOptions<Controls extends boolean = false> {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls
  /**
   * Start the interval automatically on mount
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Callback on every interval tick, receives the incremented count
   */
  callback?: (count: number) => void
  /**
   * Increment the counter (and fire `callback`) immediately when the interval starts or `resume` is
   * called
   *
   * @default false
   */
  immediateCallback?: boolean
}
export interface UseIntervalControls {
  /**
   * Current count
   */
  counter: number
  /**
   * Reset the counter to `0`
   */
  reset: () => void
  /**
   * `true` while the interval is running
   */
  isActive: boolean
  /**
   * Stop the interval
   */
  pause: () => void
  /**
   * (Re)start the interval
   */
  resume: () => void
}
export type UseIntervalReturn = number | UseIntervalControls
/**
 * Map from @vueuse/shared `useInterval`.
 *
 * @example
 * // count will increase every 200ms
 * const counter = useInterval(200)
 *
 * const { counter, isActive, pause, resume, reset } = useInterval(200, { controls: true })
 */
export declare function useInterval(
  interval?: number,
  options?: UseIntervalOptions<false>,
): number
export declare function useInterval(
  interval: number,
  options: UseIntervalOptions<true>,
): UseIntervalControls
```
