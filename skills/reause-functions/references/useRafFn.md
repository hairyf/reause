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
   * Time elapsed since the creation of the web page. See {@link https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp#the_time_origin Time origin}.
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
   * The maximum frame per second to execute the function.
   * Set to `null` to disable the limit.
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
   * Stop the loop — the pending frame is cancelled and no further frames are
   * scheduled
   */
  pause: () => void
  /**
   * (Re)start the loop — schedules the next frame immediately
   */
  resume: () => void
}
/**
 * React port of VueUse's `useRafFn`.
 *
 * Map from @vueuse/core `useRafFn`
 * (`source/vueuse/packages/core/useRafFn/`): a self-contained
 * `requestAnimationFrame` chain that calls the callback with
 * `{ delta, timestamp }` on every frame, with controls of pausing and
 * resuming.
 *
 * React divergences:
 * - the returned control object keeps upstream's `Pausable` members
 *   (`isActive` / `pause` / `resume`), but the `isActive` shallow ref becomes
 *   a plain boolean state flipped by `resume` / `pause`;
 * - the setup-time auto `resume()` (`immediate`, client-only) becomes a
 *   mount `useEffect`, and `tryOnScopeDispose(pause)` becomes its cleanup —
 *   `immediate` is read exactly once on mount, like upstream reads it once
 *   during setup: a later change to the option neither restarts nor stops the
 *   loop. Frames are only ever scheduled inside effects, so SSR renders never
 *   touch `window.requestAnimationFrame`;
 * - `fn`, `fpsLimit`, `once` and `window` are read through refs on every
 *   frame instead of from the setup closure, so the running loop always sees
 *   the latest values (upstream recomputes on watchers);
 * - `fpsLimit` is a plain `number | null`, read per frame
 *   (upstream: `MaybeRefOrGetter` + `computed`). The
 *   upstream getter form (`() => number | null`) and a React ref are
 *   deliberately not accepted — zero-argument getters were removed repo-wide
 *   (#462/#490) — so they are rejected at the type level.
 *
 * @example
 * const { pause, resume } = useRafFn(() => setCount(c => c + 1))
 */
export declare function useRafFn(
  fn: (args: UseRafFnCallbackArguments) => void,
  options?: UseRafFnOptions,
): UseRafFnReturn
```
