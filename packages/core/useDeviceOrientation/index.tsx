import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useState } from 'react'

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
export function useDeviceOrientation(options: UseDeviceOrientationOptions = {}): UseDeviceOrientationReturn {
  const { window: customWindow } = options

  const [isSupported, setIsSupported] = useState(false)
  const [isAbsolute, setIsAbsolute] = useState<boolean | null>(false)
  const [alpha, setAlpha] = useState<number | null>(null)
  const [beta, setBeta] = useState<number | null>(null)
  const [gamma, setGamma] = useState<number | null>(null)

  // Attach the passive `deviceorientation` listener in a mount effect
  // (SSR-safe): re-registers when a custom `window` option changes and
  // removes the listener on unmount (upstream: `useEventListener` inside
  // `useSupported`). The listener only attaches when the capability probe
  // passes (upstream: `if (window && isSupported.value)`).
  useEffect(() => {
    const win = customWindow === undefined
      ? (typeof window === 'undefined' ? undefined : window)
      : customWindow
    if (!win)
      return

    const supported = 'DeviceOrientationEvent' in win
    setIsSupported(supported)
    if (!supported)
      return

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setIsAbsolute(event.absolute)
      setAlpha(event.alpha)
      setBeta(event.beta)
      setGamma(event.gamma)
    }

    win.addEventListener('deviceorientation', handleOrientation, { passive: true })

    return () => {
      win.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [customWindow])

  return {
    isSupported,
    isAbsolute,
    alpha,
    beta,
    gamma,
  }
}
