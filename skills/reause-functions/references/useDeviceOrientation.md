---
category: Sensors
---

# useDeviceOrientation

Reactive [DeviceOrientationEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent)

## Usage

```tsx
import { useDeviceOrientation } from '@reause/core'

const { isAbsolute, alpha, beta, gamma } = useDeviceOrientation()
```

| State      | Type              | Description                                                                                                       |
| ---------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| isAbsolute | `boolean \| null` | Whether the device orientation is absolute (relative to the Earth's coordinate system) or relative to the device. |
| alpha      | `number \| null`  | The rotation of the device around the z axis (0–360 degrees).                                                     |
| beta       | `number \| null`  | The rotation of the device around the x axis (−180–180 degrees).                                                  |
| gamma      | `number \| null`  | The rotation of the device around the y axis (−90–90 degrees).                                                    |

You can find [more information about the state on the MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent#instance_properties).

## Type Declarations

```ts
export interface UseDeviceOrientationOptions extends ConfigurableWindow {}
export interface UseDeviceOrientationReturn {
  /**
   * Whether the current environment supports the `DeviceOrientationEvent` API. Starts `false` and
   * settles in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * Whether the device orientation is given as absolute (relative to the Earth's coordinate system)
   * or as relative to the device.
   */
  isAbsolute: boolean | null
  /**
   * The rotation of the device around the z axis (0–360 degrees).
   */
  alpha: number | null
  /**
   * The rotation of the device around the x axis (−180–180 degrees).
   */
  beta: number | null
  /**
   * The rotation of the device around the y axis (−90–90 degrees).
   */
  gamma: number | null
}
/**
 * Map from @vueuse/core `useDeviceOrientation`
 * (`source/vueuse/packages/core/useDeviceOrientation/`).
 *
 * @example
 * const { isSupported, isAbsolute, alpha, beta, gamma } = useDeviceOrientation()
 *
 * @__NO_SIDE_EFFECTS__
 */
export declare function useDeviceOrientation(
  options?: UseDeviceOrientationOptions,
): UseDeviceOrientationReturn
```
