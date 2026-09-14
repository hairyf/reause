---
category: Animation
---

# useTransition

Transition between values

## Usage

Define a source value to follow, and when changed the output will transition to the new value. If the source changes while a transition is in progress, a new transition will begin from where the previous one was interrupted.

```tsx
import { TransitionPresets, useTransition } from '@reause/core'
import { useState } from 'react'

const [source, setSource] = useState(0)
const output = useTransition(source, {
  duration: 1000,
  easing: TransitionPresets.easeInOutCubic,
})

// each `setSource(next)` tweens `output` from its current value to `next`
setSource(100)
```

Transition easing can be customized using [cubic bezier curves](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/cubic-bezier#description).

```tsx
import { useTransition } from '@reause/core'
// ---cut---
useTransition(source, {
  easing: [0.75, 0, 0.25, 1],
})
```

The following transitions are available via the `TransitionPresets` constant.

- [`linear`](https://cubic-bezier.com/#0,0,1,1)
- [`easeInSine`](https://cubic-bezier.com/#.12,0,.39,0)
- [`easeOutSine`](https://cubic-bezier.com/#.61,1,.88,1)
- [`easeInOutSine`](https://cubic-bezier.com/#.37,0,.63,1)
- [`easeInQuad`](https://cubic-bezier.com/#.11,0,.5,0)
- [`easeOutQuad`](https://cubic-bezier.com/#.5,1,.89,1)
- [`easeInOutQuad`](https://cubic-bezier.com/#.45,0,.55,1)
- [`easeInCubic`](https://cubic-bezier.com/#.32,0,.67,0)
- [`easeOutCubic`](https://cubic-bezier.com/#.33,1,.68,1)
- [`easeInOutCubic`](https://cubic-bezier.com/#.65,0,.35,1)
- [`easeInQuart`](https://cubic-bezier.com/#.5,0,.75,0)
- [`easeOutQuart`](https://cubic-bezier.com/#.25,1,.5,1)
- [`easeInOutQuart`](https://cubic-bezier.com/#.76,0,.24,1)
- [`easeInQuint`](https://cubic-bezier.com/#.64,0,.78,0)
- [`easeOutQuint`](https://cubic-bezier.com/#.22,1,.36,1)
- [`easeInOutQuint`](https://cubic-bezier.com/#.83,0,.17,1)
- [`easeInExpo`](https://cubic-bezier.com/#.7,0,.84,0)
- [`easeOutExpo`](https://cubic-bezier.com/#.16,1,.3,1)
- [`easeInOutExpo`](https://cubic-bezier.com/#.87,0,.13,1)
- [`easeInCirc`](https://cubic-bezier.com/#.55,0,1,.45)
- [`easeOutCirc`](https://cubic-bezier.com/#0,.55,.45,1)
- [`easeInOutCirc`](https://cubic-bezier.com/#.85,0,.15,1)
- [`easeInBack`](https://cubic-bezier.com/#.36,0,.66,-.56)
- [`easeOutBack`](https://cubic-bezier.com/#.34,1.56,.64,1)
- [`easeInOutBack`](https://cubic-bezier.com/#.68,-.6,.32,1.6)

For more complex easing, a custom function can be provided.

```tsx
import { useTransition } from '@reause/core'
// ---cut---
function easeOutElastic(n) {
  return n === 0
    ? 0
    : n === 1
      ? 1
      : (2 ** (-10 * n)) * Math.sin((n * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
}

useTransition(source, {
  easing: easeOutElastic,
})
```

To control when a transition starts, set a `delay` value. To choreograph behavior around a transition, define `onStarted` or `onFinished` callbacks.

```tsx
import { useTransition } from '@reause/core'
// ---cut---
const output = useTransition(source, {
  delay: 1000,
  onStarted() {
    // called after the transition starts
  },
  onFinished() {
    // called after the transition ends
  },
})
```

To stop transitioning, define a boolean `disabled` property. Be aware, this is not the same a `duration` of `0`. Disabled transitions track the source value **_synchronously_**. They do not respect a `delay`, and do not fire `onStarted` or `onFinished` callbacks.

## Type Declarations

```ts
/**
 * Cubic bezier points
 */
export type CubicBezierPoints = [number, number, number, number]
/**
 * Easing function
 */
export type EasingFunction = (n: number) => number
/**
 * Transition options
 */
export interface UseTransitionOptions {
  /**
   * Manually abort the running transition — checked on every frame, aborting stops the loop without
   * snapping to the target and fires `onFinished`.
   */
  abort?: () => boolean
  /**
   * Milliseconds to wait before starting the transition. A new source change while waiting cancels
   * the pending one.
   *
   * @default 0
   */
  delay?: number
  /**
   * Disables the transition — the output follows the source synchronously, and any running
   * transition is dropped.
   *
   * @default false
   */
  disabled?: boolean
  /**
   * Transition duration in milliseconds.
   *
   * @default 1000
   */
  duration?: number
  /**
   * Easing function or cubic bezier points to calculate transition progress.
   *
   * @default linear
   */
  easing?: EasingFunction | CubicBezierPoints
  /**
   * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
   */
  window?: Window
  /**
   * Callback to execute after the transition finishes.
   */
  onFinished?: () => void
  /**
   * Callback to execute after the transition starts.
   */
  onStarted?: () => void
}
declare const _TransitionPresets: {
  readonly easeInSine: readonly [0.12, 0, 0.39, 0]
  readonly easeOutSine: readonly [0.61, 1, 0.88, 1]
  readonly easeInOutSine: readonly [0.37, 0, 0.63, 1]
  readonly easeInQuad: readonly [0.11, 0, 0.5, 0]
  readonly easeOutQuad: readonly [0.5, 1, 0.89, 1]
  readonly easeInOutQuad: readonly [0.45, 0, 0.55, 1]
  readonly easeInCubic: readonly [0.32, 0, 0.67, 0]
  readonly easeOutCubic: readonly [0.33, 1, 0.68, 1]
  readonly easeInOutCubic: readonly [0.65, 0, 0.35, 1]
  readonly easeInQuart: readonly [0.5, 0, 0.75, 0]
  readonly easeOutQuart: readonly [0.25, 1, 0.5, 1]
  readonly easeInOutQuart: readonly [0.76, 0, 0.24, 1]
  readonly easeInQuint: readonly [0.64, 0, 0.78, 0]
  readonly easeOutQuint: readonly [0.22, 1, 0.36, 1]
  readonly easeInOutQuint: readonly [0.83, 0, 0.17, 1]
  readonly easeInExpo: readonly [0.7, 0, 0.84, 0]
  readonly easeOutExpo: readonly [0.16, 1, 0.3, 1]
  readonly easeInOutExpo: readonly [0.87, 0, 0.13, 1]
  readonly easeInCirc: readonly [0.55, 0, 1, 0.45]
  readonly easeOutCirc: readonly [0, 0.55, 0.45, 1]
  readonly easeInOutCirc: readonly [0.85, 0, 0.15, 1]
  readonly easeInBack: readonly [0.36, 0, 0.66, -0.56]
  readonly easeOutBack: readonly [0.34, 1.56, 0.64, 1]
  readonly easeInOutBack: readonly [0.68, -0.6, 0.32, 1.6]
}
/**
 * Common transitions
 *
 * @see https://easings.net
 */
export declare const TransitionPresets: Record<
  keyof typeof _TransitionPresets,
  CubicBezierPoints
> & {
  linear: EasingFunction
}
export declare function useTransition(
  source: number,
  options?: UseTransitionOptions,
): number
export declare function useTransition(
  source: readonly number[],
  options?: UseTransitionOptions,
): number[]
```
