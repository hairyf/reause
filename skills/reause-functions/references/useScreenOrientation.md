---
category: Browser
---

# useScreenOrientation

Reactive [Screen Orientation API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Orientation_API)

## Usage

```tsx
import { useScreenOrientation } from '@reause/core'

const {
  isSupported,
  orientation,
  angle,
  lockOrientation,
  unlockOrientation,
} = useScreenOrientation()
```

To lock the orientation, you can pass an [OrientationLockType](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/type) to the lockOrientation function:

```tsx
lockOrientation('portrait-primary')
```

and then unlock again, with the following:

```tsx
unlockOrientation()
```

Accepted orientation types are one of `"landscape-primary"`, `"landscape-secondary"`, `"portrait-primary"`, `"portrait-secondary"`, `"any"`, `"landscape"`, `"natural"` and `"portrait"`.

[Screen Orientation API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Orientation_API)

## Type Declarations

```ts
export type OrientationType =
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary"
export type OrientationLockType =
  | "any"
  | "natural"
  | "landscape"
  | "portrait"
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary"
export interface ScreenOrientation extends EventTarget {
  lock: (orientation: OrientationLockType) => Promise<void>
  unlock: () => void
  readonly type: OrientationType
  readonly angle: number
  addEventListener: (
    type: "change",
    listener: (this: this, ev: Event) => any,
    useCapture?: boolean,
  ) => void
}
/**
 * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
 */
export interface UseScreenOrientationOptions {
  window?: Window
}
export interface UseScreenOrientationReturn {
  /**
   * Whether the Screen Orientation API is available in the current window.
   */
  isSupported: boolean
  /**
   * The current orientation type. `undefined` during SSR and before the mount effect has read
   * `screen.orientation`.
   */
  orientation: OrientationType | undefined
  /**
   * The current orientation angle in degrees, `0` when unknown.
   */
  angle: number
  /**
   * Lock the screen orientation. Returns the underlying promise from `screen.orientation.lock`
   * (rejections propagate unchanged), or rejects with `'Not supported'` when the API is
   * unavailable.
   */
  lockOrientation: (type: OrientationLockType) => Promise<void>
  /**
   * Unlock the screen orientation. No-op when the API is unavailable.
   */
  unlockOrientation: () => void
}
/**
 * Map from @vueuse/core `useScreenOrientation`
 * (`source/vueuse/packages/core/useScreenOrientation/`).
 *
 * @example
 * const { isSupported, orientation, angle, lockOrientation, unlockOrientation } = useScreenOrientation()
 *
 * lockOrientation('portrait-primary')
 */
export declare function useScreenOrientation(
  options?: UseScreenOrientationOptions,
): UseScreenOrientationReturn
```
