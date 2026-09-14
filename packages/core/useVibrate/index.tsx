import { useCallback, useEffect, useRef, useState } from 'react'

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

function resolveNavigator(custom?: Navigator): Navigator | undefined {
  return custom ?? (typeof navigator === 'undefined' ? undefined : navigator)
}

function supportsVibration(nav: Navigator | undefined): nav is Navigator {
  return typeof nav !== 'undefined' && 'vibrate' in nav
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
export function useVibrate(options: UseVibrateOptions = {}): UseVibrateReturn {
  const { pattern = [], interval = 0, navigator: configurableNavigator } = options

  const [isSupported, setIsSupported] = useState(false)
  const [isActive, setIsActive] = useState(false)

  // Latest option values at call time — options are read per call or loop
  // tick, not captured per render (mirrors upstream's `toRef(pattern)`).
  const patternRef = useRef(pattern)
  const intervalRef = useRef(interval)

  useEffect(() => {
    patternRef.current = pattern
  }, [pattern])

  useEffect(() => {
    intervalRef.current = interval
  }, [interval])

  useEffect(() => {
    setIsSupported(supportsVibration(resolveNavigator(configurableNavigator)))
  }, [configurableNavigator])

  // Persistent vibration loop (upstream: `useIntervalFn(vibrate, interval,
  // { immediate: false })` behind the scheduler): starts only via
  // `intervalControls.resume()`, the first re-trigger happens after
  // `interval` ms, the loop restarts when `interval` changes, and it is
  // cleared by `pause()`, `stop()` and on unmount.
  useEffect(() => {
    if (!isActive || interval <= 0)
      return

    const id = setInterval(() => {
      const nav = resolveNavigator(configurableNavigator)
      if (supportsVibration(nav))
        nav.vibrate(patternRef.current)
    }, interval)

    return () => {
      clearInterval(id)
    }
  }, [isActive, interval, configurableNavigator])

  const vibrate = useCallback((overridePattern?: number | number[]) => {
    const nav = resolveNavigator(configurableNavigator)
    if (!supportsVibration(nav))
      return

    nav.vibrate(overridePattern ?? patternRef.current)
  }, [configurableNavigator])

  const pause = useCallback(() => {
    setIsActive(false)
  }, [])

  const resume = useCallback(() => {
    if (intervalRef.current <= 0)
      return
    setIsActive(true)
  }, [])

  // Attempt to stop the vibration:
  const stop = useCallback(() => {
    const nav = resolveNavigator(configurableNavigator)
    if (supportsVibration(nav))
      nav.vibrate(0)

    pause()
  }, [configurableNavigator, pause])

  return {
    isSupported,
    pattern,
    intervalControls: {
      pause,
      resume,
      isActive,
    },
    vibrate,
    stop,
  }
}
