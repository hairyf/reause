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
 * React port of VueUse's `useIntervalFn` — wrapper for `setInterval` with
 * controls.
 *
 * Map from @vueuse/shared `useIntervalFn`
 * Mapping: upstream accepts `MaybeRefOrGetter<number>` for the interval — this
 * port accepts a plain `number`. `isActive` is a boolean state (upstream: a
 * readonly shallow ref), also mirrored in a ref so `resume()` can check it
 * synchronously right after `immediateCallback` fires the callback — the
 * callback may `pause()` itself ("pause in callback"). The timer is scheduled
 * in a mount effect (upstream starts synchronously during setup) and cleared
 * on unmount via effect cleanup; changing the interval while active restarts
 * the timer (upstream: a `watch` on the interval calls `resume()`). The
 * callback, interval and options are kept in refs so every tick and restart
 * uses the newest ones.
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
