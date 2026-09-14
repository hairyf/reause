---
category: Animation
---

# useRafFn

Call function on every `requestAnimationFrame`. With controls of pausing and resuming.

## Usage

```tsx
import { useRafFn } from '@reause/core'
import { useState } from 'react'

const [count, setCount] = useState(0)

const { pause, resume } = useRafFn(() => {
  setCount(c => c + 1)
  console.log(count + 1)
})
```

## Type Declarations

```ts
export type { Pausable } from "../useTimeoutPoll"
export interface UseRafFnCallbackArguments {
  /**
   * Time elapsed between this and the last frame.
   */
  delta: number
  /**
   * Time elapsed since the creation of the web page. See {@link
   * https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp#the_time_origin Time
   * origin}.
   */
  timestamp: DOMHighResTimeStamp
}
export interface UseRafFnOptions extends ConfigurableWindow {
  /**
   * Start the requestAnimationFrame loop immediately on creation
   *
   * @default true
   */
  immediate?: boolean
  /**
   * The maximum frame per second to execute the function. Set to `null` to disable the limit.
   *
   * @default null
   */
  fpsLimit?: number | null
  /**
   * After the requestAnimationFrame loop executed once, it will be automatically stopped.
   *
   * @default false
   */
  once?: boolean
}
export interface UseRafFnReturn {
  /**
   * `true` while the animation frame loop is active
   */
  isActive: boolean
  /**
   * Stop the loop — the pending frame is cancelled and no further frames are scheduled
   */
  pause: () => void
  /**
   * (Re)start the loop — schedules the next frame immediately
   */
  resume: () => void
}
/**
 * Map from @vueuse/core `useRafFn`
 * (`source/vueuse/packages/core/useRafFn/`).
 *
 * @example
 * const { pause, resume } = useRafFn(() => setCount(c => c + 1))
 */
export declare function useRafFn(
  fn: (args: UseRafFnCallbackArguments) => void,
  options?: UseRafFnOptions,
): UseRafFnReturn
```
