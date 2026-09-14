import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
 * Declared inline instead of re-exporting upstream's configurable-navigator interface (see
 * `useUserMedia`) to keep the barrel export collision-free.
 */
interface ConfigurableNavigator {
  navigator?: Navigator
}

export interface UseGeolocationOptions extends Partial<PositionOptions>, ConfigurableNavigator {
  /**
   * Start watching the position immediately on mount.
   *
   * @default true
   */
  immediate?: boolean
}

export interface UseGeolocationReturn {
  /**
   * Whether the `navigator.geolocation` API is available in the current environment. `false` during
   * render and on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * Information about the position retrieved like the latitude and longitude.
   */
  coords: Omit<GeolocationPosition['coords'], 'toJSON'>
  /**
   * The time of the last geolocation call.
   */
  locatedAt: number | null
  /**
   * An error in case the geolocation API fails.
   */
  error: GeolocationPositionError | null
  /**
   * Control function to resume updating geolocation.
   */
  resume: () => void
  /**
   * Control function to pause updating geolocation.
   */
  pause: () => void
}

/**
 * Map from @vueuse/core `useGeolocation`
 * (`source/vueuse/packages/core/useGeolocation/`).
 *
 * @see https://vueuse.org/core/useGeolocation/
 * @param options
 *
 * @example
 * const { coords, locatedAt, error, resume, pause } = useGeolocation()
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    maximumAge = 30000,
    timeout = 27000,
    navigator: customNavigator,
    immediate = true,
  } = options

  const [isSupported, setIsSupported] = useState(false)
  const [locatedAt, setLocatedAt] = useState<number | null>(null)
  const [error, setError] = useState<GeolocationPositionError | null>(null)
  const [coords, setCoords] = useState<Omit<GeolocationPosition['coords'], 'toJSON'>>({
    accuracy: 0,
    latitude: Number.POSITIVE_INFINITY,
    longitude: Number.POSITIVE_INFINITY,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  })

  const watcherRef = useRef<number | null>(null)

  // The options are evaluated once during render (upstream reads them once in
  // setup); latest-value refs keep `resume` referentially stable while always
  // watching with the newest options/navigator.
  const optionsRef = useRef({ enableHighAccuracy, maximumAge, timeout })
  optionsRef.current = { enableHighAccuracy, maximumAge, timeout }
  const navigatorRef = useRef(customNavigator)
  navigatorRef.current = customNavigator

  const updatePosition = useCallback((position: GeolocationPosition) => {
    setLocatedAt(position.timestamp)
    setCoords(position.coords)
    setError(null)
  }, [])

  const pause = useCallback(() => {
    const nav = navigatorRef.current ?? (typeof navigator === 'undefined' ? undefined : navigator)
    if (watcherRef.current !== null && nav)
      nav.geolocation.clearWatch(watcherRef.current)
    watcherRef.current = null
  }, [])

  const resume = useCallback(() => {
    const nav = navigatorRef.current ?? (typeof navigator === 'undefined' ? undefined : navigator)
    if (!nav || !('geolocation' in nav))
      return
    // Clear a previous watch first so repeated `resume()` calls never leak
    // parallel watchers (upstream overwrites its single `watcher` variable).
    if (watcherRef.current !== null)
      nav.geolocation.clearWatch(watcherRef.current)
    const { enableHighAccuracy: highAccuracy, maximumAge: age, timeout: wait } = optionsRef.current
    watcherRef.current = nav.geolocation.watchPosition(
      updatePosition,
      err => setError(err),
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: age,
        timeout: wait,
      },
    )
  }, [updatePosition])

  // Resolve support after mount so SSR renders `false`, then start the watch
  // when `immediate` (upstream calls `resume()` at the end of setup).
  useEffect(() => {
    const nav = navigatorRef.current ?? (typeof navigator === 'undefined' ? undefined : navigator)
    const supported = Boolean(nav && 'geolocation' in nav)
    setIsSupported(supported)
    if (supported && immediate)
      resume()
  }, [immediate, resume])

  // Clear the active watch when the component unmounts (upstream:
  // `tryOnScopeDispose(() => pause())`).
  useEffect(() => {
    return () => pause()
  }, [pause])

  return {
    isSupported,
    coords,
    locatedAt,
    error,
    resume,
    pause,
  }
}
