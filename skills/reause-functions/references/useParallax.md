---
category: Sensors
---

# useParallax

Create parallax effect easily. It uses `useDeviceOrientation` and fallback to `useMouse` if orientation is not supported.

## Usage

```tsx
import { useParallax } from '@reause/core'
import { useRef } from 'react'

const container = useRef<HTMLDivElement>(null)
const { tilt, roll, source } = useParallax(container)
```

```tsx
<div ref={container} />
```

## Type Declarations

```ts
export interface UseParallaxOptions extends ConfigurableWindow {
  /**
   * Adjust the tilt value when the sensor source is `deviceOrientation`.
   */
  deviceOrientationTiltAdjust?: (i: number) => number
  /**
   * Adjust the roll value when the sensor source is `deviceOrientation`.
   */
  deviceOrientationRollAdjust?: (i: number) => number
  /**
   * Adjust the tilt value when the sensor source is `mouse`.
   */
  mouseTiltAdjust?: (i: number) => number
  /**
   * Adjust the roll value when the sensor source is `mouse`.
   */
  mouseRollAdjust?: (i: number) => number
}
export interface UseParallaxReturn {
  /**
   * Roll value. Scaled to `-0.5 ~ 0.5`
   */
  roll: number
  /**
   * Tilt value. Scaled to `-0.5 ~ 0.5`
   */
  tilt: number
  /**
   * Sensor source, can be `mouse` or `deviceOrientation`
   */
  source: "deviceOrientation" | "mouse"
}
/**
 * Create parallax effect easily. It uses `useDeviceOrientation` and fallback to `useMouse`
 * if orientation is not supported.
 *
 * Map from @vueuse/core `useParallax`
 * (`source/vueuse/packages/core/useParallax/`), which composes
 * `useDeviceOrientation` + `useScreenOrientation` + `useMouseInElement(target,
 * { handleOutside: false })`: the `source` is `deviceOrientation` while the
 * device orientation is supported and reports a non-zero `alpha`/`gamma`
 * (otherwise `mouse`), and `tilt`/`roll` are derived per orientation state or
 * from the cursor position relative to the element.
 *
 * React divergences from upstream:
 * - the Vue computeds (`tilt`/`roll`/`source`) become plain values derived
 *   during render from `useState`, so no re-render happens while they stay
 *   the same; the returned object is `{ tilt, roll, source }` (not tuple);
 * - `target` accepts a plain element or a ref-like `{ current }` object
 *   (React equivalent of `ElementRef`). It is re-resolved on
 *   every render and the listeners re-bind when the resolved element
 *   changes; ref-likes are re-read at bind time, so a `useRef` target that is
 *   `null` during first render still binds once React attaches the element;
 * - upstream's `useDeviceOrientation` and `useMouseInElement` listener
 *   wiring (`mousemove`/`scroll`/`resize`, plus the `deviceorientation`
 *   subscription) becomes self-contained `useEffect`s with cleanup — no
 *   `useMutationObserver`/`useResizeObserver` re-measuring. The window
 *   `scroll`/`resize` listeners re-measure the rect against the last cursor
 *   position (upstream keeps it in `useMouse`), so `tilt`/`roll` stay
 *   cursor-relative instead of snapping to the element corner;
 * - a zero-size or not-yet-measured rect yields `tilt`/`roll` `0`, where
 *   upstream divides by the zero `elementWidth`/`elementHeight` and yields
 *   `NaN` — deliberate, so the first render and SSR stay finite;
 * - SSR-safe: nothing touches `window`, `document` or the DOM during render —
 *   all listeners attach in mount effects and the initial values
 *   (`tilt: 0`, `roll: 0`, `source: 'mouse'`) render on the server.
 *
 * @param target - element or ref-like `{ current }` object returning
 *   the element to track the cursor over
 * @param options - tilt/roll adjust callbacks per sensor source, plus a
 *   custom `window` instance
 *
 * @example
 * const container = useRef<HTMLDivElement>(null)
 * const { tilt, roll, source } = useParallax(container)
 */
export declare function useParallax(
  target: RefObject<HTMLElement | null | undefined>,
  options?: UseParallaxOptions,
): UseParallaxReturn
```
