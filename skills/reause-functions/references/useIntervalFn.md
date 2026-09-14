---
category: Animation
---

# useIntervalFn

Wrapper for `setInterval` with controls

## Usage

```tsx
import { useIntervalFn } from '@reause/shared'

const { isActive, pause, resume } = useIntervalFn(() => {
  /* ... */
}, 1000)
```

## Type Declarations

```ts
type Fn = () => void
export interface UseIntervalFnOptions {
  /**
   * Start the timer automatically when the component mounts
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Execute the callback immediately after calling `resume`
   *
   * @default false
   */
  immediateCallback?: boolean
}
export interface UseIntervalFnReturn {
  /**
   * Whether the timer is currently active
   */
  isActive: boolean
  /**
   * Pause the timer
   */
  pause: () => void
  /**
   * Resume the timer (restarts it with the current interval)
   */
  resume: () => void
}
/**
 * Map from @vueuse/shared `useIntervalFn`.
 *
 * @example
 * const { isActive, pause, resume } = useIntervalFn(() => { ... }, 1000)
 */
export declare function useIntervalFn(
  cb: Fn,
  interval?: number,
  options?: UseIntervalFnOptions,
): UseIntervalFnReturn
```
