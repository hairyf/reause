---
category: Sensors
---

# useDeviceMotion

Reactive [DeviceMotionEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent)

## Usage

```tsx
import { useDeviceMotion } from '@reause/core'

const {
  acceleration,
  accelerationIncludingGravity,
  rotationRate,
  interval,
  isSupported,
} = useDeviceMotion()
```

> Note: For iOS, you need to use `ensurePermissions` and bind it with user interaction.
> After permission is granted, the API will run automatically.

| State                        | Type            | Description                                                                                                          |
| ---------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| acceleration                 | `object`        | An object giving the acceleration of the device on the three axis X, Y and Z.                                        |
| accelerationIncludingGravity | `object`        | An object giving the acceleration of the device on the three axis X, Y and Z with the effect of gravity.             |
| rotationRate                 | `object`        | An object giving the rate of change of the device's orientation on the three orientation axis alpha, beta and gamma. |
| interval                     | `Number`        | A number representing the interval of time, in milliseconds, at which data is obtained from the device.              |
| isSupported                  | `boolean`       | Whether the current environment supports the `DeviceMotionEvent` API.                                                |
| requirePermissions           | `boolean`       | Whether the platform requires permission to use the API.                                                             |
| ensurePermissions            | `Promise<void>` | An async function to request user permission. The API runs automatically once permission is granted.                 |
| permissionGranted            | `boolean`       | Whether the user has granted permission. The default is always `false`.                                              |

You can find [more information about the state on the MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent#instance_properties).

## Type Declarations

```ts
export interface UseDeviceMotionOptions extends ConfigurableWindow {
  /**
   * Request for permissions immediately if it's not granted, otherwise label and deviceIds could be
   * empty
   *
   * @default false
   */
  requestPermissions?: boolean
  /**
   * Filter for if events should to be received.
   *
   * The filter instance is captured once on mount — like upstream, where the options are evaluated
   * once during setup.
   *
   * @default invoke directly
   */
  eventFilter?: EventFilter
}
/** @deprecated use {@link UseDeviceMotionOptions} instead */
export type DeviceMotionOptions = UseDeviceMotionOptions
export interface UseDeviceMotionReturn {
  /**
   * An object giving the acceleration of the device on the three axis X, Y and Z.
   */
  acceleration: DeviceMotionEventAcceleration | null
  /**
   * An object giving the acceleration of the device on the three axis X, Y and Z with the effect of
   * gravity.
   */
  accelerationIncludingGravity: DeviceMotionEventAcceleration | null
  /**
   * An object giving the rate of change of the device's orientation on the three orientation axis
   * alpha, beta and gamma.
   */
  rotationRate: DeviceMotionEventRotationRate | null
  /**
   * A number representing the interval of time, in milliseconds, at which data is obtained from the
   * device.
   */
  interval: number
  /**
   * Whether the current environment supports the `DeviceMotionEvent` API. Starts `false` and
   * settles in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * Whether the platform requires permission to use the API.
   */
  requirePermissions: boolean
  /**
   * An async function to request user permission. The API runs automatically once permission is
   * granted.
   */
  ensurePermissions: () => Promise<void>
  /**
   * Whether the user has granted permission. The default is always `false`.
   */
  permissionGranted: boolean
}
/**
 * Map from @vueuse/core `useDeviceMotion`
 * (`source/vueuse/packages/core/useDeviceMotion/`).
 *
 * @example
 * const { acceleration, accelerationIncludingGravity, rotationRate, interval, isSupported } = useDeviceMotion()
 */
export declare function useDeviceMotion(
  options?: UseDeviceMotionOptions,
): UseDeviceMotionReturn
```
