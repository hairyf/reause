---
category: Sensors
---

# useBattery

Reactive [Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API)

## Usage

```tsx
import { useBattery } from '@reause/core'

const { isSupported, charging, chargingTime, dischargingTime, level } = useBattery()
```

| State           | Type      | Description                                                       |
| --------------- | --------- | ----------------------------------------------------------------- |
| isSupported     | `boolean` | If the Battery Status API is supported in the current browser.    |
| charging        | `boolean` | If the device is currently charging.                              |
| chargingTime    | `number`  | The number of seconds until the device becomes fully charged.     |
| dischargingTime | `number`  | The number of seconds before the device becomes fully discharged. |
| level           | `number`  | A number between 0 and 1 representing the current charge level.   |

::: warning Browser Support
The Battery Status API has limited browser support. It is currently only available in Chromium-based browsers. Always check `isSupported` before using the values.
:::

## Use-cases

Our applications normally are not empathetic to battery level, we can make a few adjustments to our applications that will be more friendly to low battery users.

- Trigger a special "dark-mode" battery saver theme settings.
- Stop auto playing videos in news feeds.
- Disable some background workers that are not critical.
- Limit network calls and reduce CPU/Memory consumption.

## Type Declarations

```ts
/**
 * Options for `useBattery`.
 */
export interface UseBatteryOptions extends ConfigurableNavigator {}
/**
 * Return type of `useBattery`.
 */
export interface UseBatteryReturn {
  /**
   * Whether the Battery Status API is supported in the current browser. `false` during render and
   * on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * If the device is currently charging.
   */
  charging: boolean
  /**
   * The number of seconds until the device becomes fully charged.
   */
  chargingTime: number
  /**
   * The number of seconds before the device becomes fully discharged.
   */
  dischargingTime: number
  /**
   * A number between 0 and 1 representing the current charge level.
   */
  level: number
}
/**
 * The `BatteryManager` object handed back by `navigator.getBattery()` — the DOM lib does not ship
 * this interface, so it is declared here as upstream does. The properties are read through getters
 * on the live object.
 */
export interface BatteryManager extends EventTarget {
  charging: boolean
  chargingTime: number
  dischargingTime: number
  level: number
}
/**
 * Map from @vueuse/core `useBattery`
 * (`source/vueuse/packages/core/useBattery/`).
 *
 * @see https://vueuse.org/core/useBattery/
 * @param options
 *
 * @example
 * const { isSupported, charging, chargingTime, dischargingTime, level } = useBattery()
 */
export declare function useBattery(
  options?: UseBatteryOptions,
): UseBatteryReturn
```
