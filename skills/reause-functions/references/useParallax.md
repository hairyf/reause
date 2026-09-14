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
 * Map from @vueuse/core `useParallax`
 * (`source/vueuse/packages/core/useParallax/`).
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   track the cursor over, resolved with the shared `unrefElement`
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
