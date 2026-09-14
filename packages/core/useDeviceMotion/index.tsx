import type { ConfigurableWindow, EventFilter } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

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

interface DeviceMotionEventiOS extends UseDeviceMotionOptions {
  requestPermission: () => Promise<'granted' | 'denied'>
}

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

const DEFAULT_ACCELERATION: DeviceMotionEventAcceleration = { x: null, y: null, z: null }
const DEFAULT_ROTATION_RATE: DeviceMotionEventRotationRate = { alpha: null, beta: null, gamma: null }

/**
 * Map from @vueuse/core `useDeviceMotion`
 * (`source/vueuse/packages/core/useDeviceMotion/`). Reactive
 * [DeviceMotionEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent) —
 * information about the speed of changes for the device's position and orientation.
 *
 * React divergences:
 * - upstream derives `isSupported` and `requirePermissions` through its
 *   `useSupported` helper (computed refs); here they are resolved once in the
 *   same mount effect that attaches the `devicemotion` listener, so nothing
 *   touches `DeviceMotionEvent` during render (SSR-safe) and the
 *   `requirePermissions` probe sees the fresh `isSupported` result;
 * - upstream's `useEventListener` + `createFilterWrapper` become a
 *   self-contained `init` inside a mount effect that registers the passive
 *   `devicemotion` listener and removes it on unmount; the optional
 *   `eventFilter` is captured once on mount, like upstream's setup-time read;
 * - the iOS permission flow (`requestPermissions: true`) mirrors upstream: `ensurePermissions`
 * requests the permission when the platform requires it and the mount effect starts the listener
 * once it resolves (upstream double-calls `init` — inside `ensurePermissions` and in
 * `ensurePermissions().then(() => init())` — which this port dedupes into the single `.then()`
 * re-add; `init` is idempotent, so behavior is identical). Without `requestPermissions`, call
 * `ensurePermissions` from a user interaction — the listener is attached at mount already;
 * - `permissionGranted` defaults to `false` (upstream's `shallowRef(false)`),
 *   even when the API requires no permission — it only flips via
 *   `ensurePermissions`.
 *
 * @example
 * const { acceleration, accelerationIncludingGravity, rotationRate, interval, isSupported } = useDeviceMotion()
 */
export function useDeviceMotion(options: UseDeviceMotionOptions = {}): UseDeviceMotionReturn {
  const {
    window: customWindow,
    eventFilter,
  } = options

  const [acceleration, setAcceleration] = useState<DeviceMotionEventAcceleration | null>(DEFAULT_ACCELERATION)
  const [accelerationIncludingGravity, setAccelerationIncludingGravity] = useState<DeviceMotionEventAcceleration | null>(DEFAULT_ACCELERATION)
  const [rotationRate, setRotationRate] = useState<DeviceMotionEventRotationRate | null>(DEFAULT_ROTATION_RATE)
  const [interval, setInterval] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [requirePermissions, setRequirePermissions] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)

  // Latest-options mirror: the mount effect and `ensurePermissions` always
  // read the current render's options (upstream closes over the setup-time
  // ones).
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Latest-value mirrors so the async permission flow reads fresh state
  // without re-creating the stable callbacks.
  const requirePermissionsRef = useRef(false)
  const permissionGrantedRef = useRef(false)
  const isActiveRef = useRef(false)
  const removeListenerRef = useRef<(() => void) | null>(null)

  const setPermissionGrantedState = useCallback((granted: boolean) => {
    permissionGrantedRef.current = granted
    setPermissionGranted(granted)
  }, [])

  // the filter is captured once on mount (upstream reads `eventFilter` from
  // options during setup and builds the wrapper in `init`)
  const eventFilterRef = useRef(eventFilter)

  // stable handler mirror — the latest handler is invoked by the (once-created)
  // listener without re-registering per render
  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    setAcceleration({
      x: event.acceleration?.x || null,
      y: event.acceleration?.y || null,
      z: event.acceleration?.z || null,
    })
    setAccelerationIncludingGravity({
      x: event.accelerationIncludingGravity?.x || null,
      y: event.accelerationIncludingGravity?.y || null,
      z: event.accelerationIncludingGravity?.z || null,
    })
    setRotationRate({
      alpha: event.rotationRate?.alpha || null,
      beta: event.rotationRate?.beta || null,
      gamma: event.rotationRate?.gamma || null,
    })
    setInterval(event.interval)
  }, [])
  const handleDeviceMotionRef = useRef(handleDeviceMotion)
  handleDeviceMotionRef.current = handleDeviceMotion

  const init = useCallback((win: Window) => {
    removeListenerRef.current?.()
    const listener = (event: DeviceMotionEvent) => {
      const invoke = () => handleDeviceMotionRef.current(event)
      const filter = eventFilterRef.current
      if (filter)
        filter(invoke)
      else
        invoke()
    }
    win.addEventListener('devicemotion', listener, { passive: true })
    removeListenerRef.current = () => win.removeEventListener('devicemotion', listener)
  }, [])

  // Requests the iOS permission when the platform requires it. The listener
  // is NOT started here — upstream's `init()` inside `ensurePermissions` is a
  // duplicate of the mount effect's re-add (upstream index.ts:105 + 117):
  // the mount effect attaches the listener before/after this resolves
  // (`requestPermissions` path: `.then(() => init(win))`; otherwise the
  // listener is already attached). Keeping a single `init` per path avoids
  // tearing the listener down and re-adding it.
  const ensurePermissions = useCallback(async (): Promise<void> => {
    if (!requirePermissionsRef.current)
      setPermissionGrantedState(true)

    if (permissionGrantedRef.current)
      return
    if (requirePermissionsRef.current) {
      const requestPermission = (DeviceMotionEvent as unknown as DeviceMotionEventiOS).requestPermission
      try {
        const response = await requestPermission()
        if (response === 'granted')
          setPermissionGrantedState(true)
      }
      catch (error) {
        console.error(error)
      }
    }
  }, [setPermissionGrantedState])

  // Capability detection (upstream: the `useSupported` setup callbacks) plus
  // the trailing `if (isSupported.value) { ... init() }` block — moved into a
  // mount effect so nothing touches `DeviceMotionEvent` during render
  // (SSR-safe) and the `requirePermissions` probe sees the resolved
  // `isSupported` value.
  useEffect(() => {
    const win = customWindow ?? (typeof window === 'undefined' ? undefined : window)
    if (!win)
      return

    isActiveRef.current = true

    const supported = typeof DeviceMotionEvent !== 'undefined'
    setIsSupported(supported)

    const requiresPermission = supported
      && 'requestPermission' in DeviceMotionEvent
      && typeof DeviceMotionEvent.requestPermission === 'function'
    requirePermissionsRef.current = requiresPermission
    setRequirePermissions(requiresPermission)

    if (supported) {
      if (optionsRef.current.requestPermissions && requiresPermission) {
        void ensurePermissions().then(() => {
          if (isActiveRef.current)
            init(win)
        })
      }
      else {
        init(win)
      }
    }

    return () => {
      isActiveRef.current = false
      removeListenerRef.current?.()
      removeListenerRef.current = null
    }
  }, [customWindow, ensurePermissions, init])

  return {
    acceleration,
    accelerationIncludingGravity,
    rotationRate,
    interval,
    isSupported,
    requirePermissions,
    ensurePermissions,
    permissionGranted,
  }
}
