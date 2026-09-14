---
category: Browser
---

# useVibrate

Reactive [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)

Most modern mobile devices include vibration hardware, which lets software
code provides physical feedback to the user by causing the device to shake.

The Vibration API offers Web apps the ability to access this hardware,
if it exists, and does nothing if the device doesn't support it.

## Usage

Vibration is described as a pattern of on-off pulses, which may be of varying
lengths.

The pattern may consist of either a single integer describing the
number of milliseconds to vibrate, or an array of integers describing
a pattern of vibrations and pauses.

```tsx
import { useVibrate } from '@reause/core'

// This vibrates the device for 300 ms,
// then pauses for 100 ms before vibrating the device again for another 300 ms:
const { vibrate, stop, isSupported } = useVibrate({ pattern: [300, 100, 300] })

// Start the vibration, it will automatically stop when the pattern is complete:
vibrate()

// But if you want to stop it, you can:
stop()
```

## Type Declarations

```ts
export interface UseVibrateOptions {
  /**
   * Vibration Pattern.
   *
   * An array of values describes alternating periods in which the device is vibrating and not
   * vibrating. Each value in the array is converted to an integer, then interpreted alternately as
   * the number of milliseconds the device should vibrate and the number of milliseconds it should
   * not be vibrating. A single number vibrates for that many milliseconds.
   *
   * @default []
   */
  pattern?: number | number[]
  /**
   * Interval in ms to re-trigger the pattern as a persistent vibration loop.
   *
   * Pass `0` to disable. The loop does not start by itself: call `intervalControls.resume()`
   * (mirroring upstream's `scheduler` + `useIntervalFn(..., { immediate: false })`) to start it,
   * and `intervalControls.pause()` / `stop()` to stop it.
   *
   * @default 0
   */
  interval?: number
  /**
   * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
   */
  navigator?: Navigator
}
export interface UseVibrateReturn {
  /**
   * Whether the Vibration API is available. `false` during render and on the server, resolved in a
   * mount effect.
   */
  isSupported: boolean
  /**
   * The current vibration pattern.
   */
  pattern: number | number[]
  /**
   * Pausable controls for the `interval` re-trigger loop (upstream `intervalControls?: Pausable`):
   * `resume()` starts the loop (no-op when `interval <= 0`), `pause()` stops it, `isActive` reports
   * whether the loop is currently running.
   */
  intervalControls: {
    pause: () => void
    resume: () => void
    isActive: boolean
  }
  /**
   * Start the vibration. It stops automatically when the pattern completes — a single `vibrate()`
   * call never loops on its own (upstream parity); use `intervalControls.resume()` to start the
   * persistent `interval` loop.
   */
  vibrate: (pattern?: number | number[]) => void
  /**
   * Stop any ongoing vibration and cancel a pending interval loop.
   */
  stop: () => void
}
/**
 * Map from @vueuse/core `useVibrate`
 * (`source/vueuse/packages/core/useVibrate/`).
 *
 * @see https://vueuse.org/useVibrate
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
 *
 * @example
 * const { vibrate, stop, isSupported } = useVibrate({ pattern: [300, 100, 300] })
 *
 * vibrate() // start the vibration, it stops when the pattern completes
 * stop() // stop it manually
 */
export declare function useVibrate(
  options?: UseVibrateOptions,
): UseVibrateReturn
```
