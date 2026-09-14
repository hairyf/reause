---
category: Sensors
---

# useIdle

Tracks whether the user is being inactive

## Usage

```tsx
import { useIdle } from '@reause/core'

const { idle, lastActive, reset } = useIdle(5 * 60 * 1000) // 5 min

console.log(idle) // true or false
```

`reset()` restarts the idle timer without touching `lastActive`.

## Type Declarations

```ts
export interface UseIdleOptions extends ConfigurableWindow {
  /**
   * Event names that listen to for detected user activity
   *
   * @default ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']
   */
  events?: (keyof WindowEventMap)[]
  /**
   * Listen for document visibility change
   *
   * @default true
   */
  listenForVisibilityChange?: boolean
  /**
   * Initial state of the idle value
   *
   * @default false
   */
  initialState?: boolean
  /**
   * Filter for if events should to be received.
   *
   * @default throttleFilter(50)
   */
  eventFilter?: EventFilter
}
export interface UseIdleReturn {
  idle: boolean
  lastActive: number
  isPending: boolean
  reset: () => void
  stop: () => void
  start: () => void
}
/**
 * Map from @vueuse/core `useIdle`
 * (`source/vueuse/packages/core/useIdle/`).
 *
 * @example
 * const { idle, lastActive, reset } = useIdle(5 * 60 * 1000) // 5 min
 */
export declare function useIdle(
  timeout?: number,
  options?: UseIdleOptions,
): UseIdleReturn
```
