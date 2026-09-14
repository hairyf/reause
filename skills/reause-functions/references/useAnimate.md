---
category: Animation
---

# useAnimate

Reactive [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)

## Usage

### Basic Usage

The `useAnimate` function returns the animation instance and control functions.

```tsx
import { useAnimate } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLSpanElement>(null)
const {
  isSupported,
  animate,

  // actions
  play,
  pause,
  reverse,
  finish,
  cancel,

  // states
  pending,
  playState,
  replaceState,
  startTime,
  currentTime,
  timeline,
  playbackRate,
} = useAnimate(el, { transform: 'rotate(360deg)' }, 1000)

return <span ref={el} style={{ display: 'inline-block' }}>useAnimate</span>
```

### Custom Keyframes

Either an array of keyframe objects, or a keyframe object, or a controllable state. See [Keyframe Formats](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats) for more details.

```tsx
import { useAnimate } from '@reause/core'

const keyframes = { transform: 'rotate(360deg)' }
// Or
const keyframes = [
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(360deg)' },
]
// Or
const keyframes = { current: [
  { clipPath: 'circle(20% at 0% 30%)' },
  { clipPath: 'circle(20% at 50% 80%)' },
  { clipPath: 'circle(20% at 100% 30%)' },
] }

useAnimate(el, keyframes, 1000)
```

### Options

The third argument accepts a duration number or an options object with the following additional properties on top of [KeyframeAnimationOptions](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate#parameters):

```tsx
import { useAnimate } from '@reause/core'

useAnimate(el, keyframes, {
  duration: 1000,
  // Start playing immediately (default: true)
  immediate: true,
  // Commit the end styling state to the element (default: false)
  commitStyles: false,
  // Persist the animation (default: false)
  persist: false,
  // Initial playback rate (default: 1)
  playbackRate: 1,
  // Callback when animation is initialized
  onReady(animate) {
    console.log('Animation ready', animate)
  },
  // Callback when an error occurs
  onError(e) {
    console.error('Animation error', e)
  },
})
```

### Delaying Start

Set `immediate: false` to prevent the animation from starting automatically.

```tsx
import { useAnimate } from '@reause/core'

const { play } = useAnimate(el, keyframes, {
  duration: 1000,
  immediate: false,
})

// Start the animation manually
play()
```

## Type Declarations

```ts
/**
 * Options for `useAnimate`: the platform `KeyframeAnimationOptions`
 * (`duration` / `easing` / `iterations` / `direction` / `fill`, ...) plus the
 * VueUse-specific knobs — `immediate`, `commitStyles`, `persist`,
 * `playbackRate`, `onReady`, `onError` — and a custom `window` instance, e.g.
 * working with iframes or in testing environments.
 */
export interface UseAnimateOptions
  extends KeyframeAnimationOptions, ConfigurableWindow {
  /**
   * Will automatically run play when `useAnimate` is used
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Whether to commit the end styling state of an animation to the element
   * being animated. In general, you should use `fill` option with this.
   *
   * @default false
   */
  commitStyles?: boolean
  /**
   * Whether to persist the animation
   *
   * @default false
   */
  persist?: boolean
  /**
   * Initial `playbackRate` of the animation
   *
   * @default 1
   */
  playbackRate?: number
  /**
   * Executed after animation initialization
   */
  onReady?: (animate: Animation) => void
  /**
   * Callback when error is caught.
   */
  onError?: (e: unknown) => void
}
/**
 * Animation keyframes — an array of keyframe objects, a keyframe object, or
 * `null` (see [Keyframe Formats](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats)),
 * as a plain value.
 */
export type UseAnimateKeyframes = Keyframe[] | PropertyIndexedKeyframes | null
/**
 * Return of `useAnimate`. Mirrors the upstream `UseAnimateReturn` member by
 * member; the upstream Vue refs become plain values:
 * - `isSupported` is `boolean` state (upstream: `ComputedRef<boolean>`);
 * - `animate` is the `Animation` object or `undefined` (upstream:
 *   `ShallowRef<Animation | undefined>`);
 * - the state members `pending` / `playState` / `replaceState` /
 *   `startTime` / `currentTime` / `timeline` / `playbackRate` are plain values
 *   re-rendered on every animation frame while the animation runs —
 *   upstream's `ComputedRef`s / `WritableComputedRef`s have no setter here, so
 *   seeking (`animate.currentTime = ...`) goes through the returned `animate`
 *   object directly;
 * - the controls `play` / `pause` / `reverse` / `finish` / `cancel` are stable.
 */
export interface UseAnimateReturn {
  /**
   * Whether the current environment supports the Web Animations API
   * (`Element.animate`), probed on the resolved `window` option. Starts
   * `false` and settles in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * The `Animation` instance created on the target element, `undefined` while
   * no target is mounted or the API is unsupported.
   */
  animate: Animation | undefined
  /** Start or resume playing the animation. */
  play: () => void
  /** Pause the animation. */
  pause: () => void
  /** Reverse the playback direction of the animation. */
  reverse: () => void
  /** Seek the animation to its end. */
  finish: () => void
  /** Abort the animation. */
  cancel: () => void
  /** Whether the animation is waiting for a pending play/pause task. */
  pending: boolean
  /** `idle` | `running` | `paused` | `finished` playback state. */
  playState: AnimationPlayState
  /** `active` | `removed` | `persisted` replace state. */
  replaceState: AnimationReplaceState
  /** The scheduled time when the animation's playback began (`null` until then). */
  startTime: number | CSSNumberish | null
  /** The current time of the animation, pace-set by its timeline. */
  currentTime: CSSNumberish | null
  /** The timeline this animation is running on. */
  timeline: AnimationTimeline | null
  /** The current playback rate of the animation. */
  playbackRate: number
}
/**
 * Reactive [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API).
 *
 * Map from @vueuse/core `useAnimate`
 * (`source/vueuse/packages/core/useAnimate/`): creates an `Animation` on the
 * target element via `Element.animate(keyframes, options)` and mirrors its
 * mutable attributes (`playState`, `currentTime`, `playbackRate`, ...) into
 * state on every animation frame through a `useRafFn` loop, while exposing
 * stable controls (`play` / `pause` / `reverse` / `finish` / `cancel`).
 *
 * React divergences:
 * - upstream's Vue watch (target + keyframes) / `tryOnMounted` / scope-dispose
 *   become `useEffect`s: the mount effect creates the animation (and re-creates
 *   it when the resolved target element appears or changes, keeping it paused
 *   when `immediate: false`), the keyframes effect swaps the animation's
 *   `effect` when the resolved keyframes change, and the unmount cleanup calls
 *   `cancel`;
 * - the returned `ComputedRef` / `WritableComputedRef` members become plain
 *   values re-rendered per frame — the writable setters (e.g. seeking through
 *   `currentTime`) are dropped, use the returned `animate` object for that;
 * - `keyframes` is re-read on every render and is compared
 *   with deep equality, so a deep-equal
 *   reassignment (e.g. reordered keys) stays silent (upstream: a deep
 *   watcher);
 * - `isSupported` is plain `boolean` state settled in the mount effect
 *   (re-probing when the resolved `window` option changes), and internal
 *   gating reads a ref mirror so effects decide synchronously (upstream
 *   `useSupported` computed);
 * - the `finish` / `cancel` / `remove` event listeners are bound to the
 *   `Animation` object through `useEventListener` (upstream:
 *   `useEventListener(animate, ...)`), which rebinds when the animation is
 *   replaced.
 *
 * @example
 * const el = useRef<HTMLSpanElement>(null)
 * const { isSupported, play, pause, reverse, playState, currentTime } =
 *   useAnimate(el, { transform: 'rotate(360deg)' }, 1000)
 */
export declare function useAnimate(
  target: ElementTarget,
  keyframes: UseAnimateKeyframes,
  options?: number | UseAnimateOptions,
): UseAnimateReturn
```
