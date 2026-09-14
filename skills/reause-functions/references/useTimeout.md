---
category: Animation
---

# useTimeout

A reactive value that becomes `true` after a given time.

## Usage

```tsx
import { useTimeout } from '@reause/shared'

const ready = useTimeout(1000)
```

After 1 second, `ready` becomes `true`.

### With Controls

```tsx
import { useTimeout } from '@reause/shared'

const { ready, start, stop, isPending } = useTimeout(1000, { controls: true })

// Check if timeout is pending
console.log(isPending) // true

// Stop the timeout
stop()

// Start/restart the timeout
start()
```

### Options

| Option      | Type         | Default | Description                                      |
| ----------- | ------------ | ------- | ------------------------------------------------ |
| `controls`  | `boolean`    | `false` | Expose `start`, `stop`, and `isPending` controls |
| `immediate` | `boolean`    | `true`  | Start the timeout immediately                    |
| `callback`  | `() => void` | —       | Called when the timeout completes                |

### Callback on Timeout

```tsx
import { useTimeout } from '@reause/shared'

useTimeout(1000, {
  callback: () => {
    console.log('Timeout completed!')
  },
})
```

### Reactive Interval

The timeout duration can be reactive:

```tsx
import { useTimeout } from '@reause/shared'
import { useRef } from 'react'

const duration = useRef(1000)
const ready = useTimeout(duration)

// Change the duration (only affects future timeouts when using controls)
duration.current = 2000
```

## Type Declarations

```ts
export interface UseTimeoutOptions<Controls extends boolean = false> {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls
  /**
   * Callback on timeout
   */
  callback?: () => void
  /**
   * Start the timer immediately
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Execute the callback immediately after calling `start`
   *
   * @default false
   */
  immediateCallback?: boolean
}
export interface UseTimeoutReturn {
  /**
   * `true` once the timeout has fired
   */
  ready: boolean
  /**
   * `true` while the timer is armed and waiting
   */
  isPending: boolean
  /**
   * (Re)arm the timer
   */
  start: () => void
  /**
   * Cancel the pending timer
   */
  stop: () => void
}
/**
 * Map from @vueuse/shared `useTimeout`.
 *
 * @example
 * const ready = useTimeout(1000) // boolean, becomes true after 1s
 *
 * const { ready, start, stop } = useTimeout(1000, { controls: true })
 */
export declare function useTimeout(
  interval?: number,
  options?: UseTimeoutOptions<false>,
): boolean
export declare function useTimeout(
  interval: number,
  options: UseTimeoutOptions<true>,
): UseTimeoutReturn
```
