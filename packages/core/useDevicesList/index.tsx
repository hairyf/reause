import type { ConfigurableNavigator } from '../useUserMedia'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSupported } from '../useSupported'

export interface UseDevicesListOptions extends ConfigurableNavigator {
  /**
   * Fired after every successful device enumeration (`devices` update).
   *
   * @default undefined
   */
  onUpdated?: (devices: MediaDeviceInfo[]) => void
  /**
   * Request for permissions immediately if it's not granted, otherwise label and deviceIds could be
   * empty
   *
   * @default false
   */
  requestPermissions?: boolean
  /**
   * Request for types of media permissions
   *
   * @default { audio: true, video: true }
   */
  constraints?: MediaStreamConstraints
}

export interface UseDevicesListReturn {
  /**
   * All devices
   */
  devices: MediaDeviceInfo[]
  videoInputs: MediaDeviceInfo[]
  audioInputs: MediaDeviceInfo[]
  audioOutputs: MediaDeviceInfo[]
  isSupported: boolean
  permissionGranted: boolean
  ensurePermissions: () => Promise<boolean>
  /**
   * Register a callback fired after every successful device enumeration (`devices` update) —
   * `useListener` protocol `(fn) => () => void` (the returned off function unsubscribes it).
   */
  onUpdated: (fn: (devices: MediaDeviceInfo[]) => void) => () => void
}

/**
 * Map from @vueuse/core `useDevicesList`
 * (`source/vueuse/packages/core/useDevicesList/`).
 *
 * @example
 * const { devices, videoInputs: cameras, audioInputs: microphones, audioOutputs: speakers } = useDevicesList()
 */
export function useDevicesList(options: UseDevicesListOptions = {}): UseDevicesListReturn {
  const {
    requestPermissions = false,
    constraints = { audio: true, video: true },
  } = options

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [permissionGranted, setPermissionGranted] = useState(false)

  const isSupported = useSupported(() => {
    const nav = options.navigator ?? (typeof navigator === 'undefined' ? undefined : navigator)
    return Boolean(nav?.mediaDevices?.enumerateDevices)
  })

  // Latest-value refs keep the stable callbacks fresh without re-creating
  // their identities across renders.
  const isSupportedRef = useRef(false)
  isSupportedRef.current = isSupported
  const permissionGrantedRef = useRef(false)
  const constraintsRef = useRef(constraints)
  constraintsRef.current = constraints
  const onUpdatedRef = useRef(options.onUpdated)
  onUpdatedRef.current = options.onUpdated
  const navigatorRef = useRef<Navigator | undefined>(
    options.navigator ?? (typeof navigator === 'undefined' ? undefined : navigator),
  )
  navigatorRef.current = options.navigator ?? (typeof navigator === 'undefined' ? undefined : navigator)
  // The transient stream acquired to trigger the permission prompt (upstream:
  // closure variable — a ref survives React renders and stays stop-able).
  const streamRef = useRef<MediaStream | null>(null)

  // `onUpdated` — upstream's option callback, plus a `useListener`-style
  // registration function exposed on the return, both fired after every
  // successful enumeration.
  const updatedFns = useRef(new Set<(devices: MediaDeviceInfo[]) => void>())

  const onUpdated = useCallback((fn: (devices: MediaDeviceInfo[]) => void) => {
    updatedFns.current.add(fn)
    return () => {
      updatedFns.current.delete(fn)
    }
  }, [])

  const updateTrigger = useCallback((nextDevices: MediaDeviceInfo[]) => {
    onUpdatedRef.current?.(nextDevices)
    Array.from(updatedFns.current).forEach(fn => fn(nextDevices))
  }, [])

  // Inlined upstream's lazy `usePermission(...).query()` inside
  // `ensurePermissions` — the query only runs on demand, so no
  // `navigator.permissions.query` fires on mount (`usePermission` is a hook
  // and would run its own mount query, which upstream avoids by creating it
  // per `ensurePermissions` call).
  const queryPermissionStatus = useCallback(async (): Promise<PermissionStatus | undefined> => {
    const permissions = navigatorRef.current?.permissions
    if (!permissions)
      return undefined
    const deviceName = constraintsRef.current.video ? 'camera' : 'microphone'
    try {
      return await permissions.query({ name: deviceName })
    }
    catch {
      return undefined
    }
  }, [])

  // Unmount cleanup of the event subscriptions (upstream `tryOnScopeDispose`).
  useEffect(() => {
    return () => {
      updatedFns.current.clear()
    }
  }, [])

  const update = useCallback(async () => {
    if (!isSupportedRef.current)
      return

    const nav = navigatorRef.current
    if (!nav?.mediaDevices)
      return

    const nextDevices = await nav.mediaDevices.enumerateDevices()
    setDevices(nextDevices)
    updateTrigger(nextDevices)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [updateTrigger])

  const ensurePermissions = useCallback(async (): Promise<boolean> => {
    const currentConstraints = constraintsRef.current

    if (!isSupportedRef.current)
      return false
    if (permissionGrantedRef.current)
      return true

    const status = await queryPermissionStatus()
    if (status?.state !== 'granted') {
      let granted = true
      try {
        const nav = navigatorRef.current
        const allDevices = await nav!.mediaDevices.enumerateDevices()
        const hasCamera = allDevices.some(device => device.kind === 'videoinput')
        const hasMicrophone = allDevices.some(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        // upstream mutates the caller's `constraints` object; here the
        // adjustments are applied to a fresh copy so extra top-level
        // constraint keys are preserved and the caller's object is untouched
        streamRef.current = await nav!.mediaDevices.getUserMedia({
          ...currentConstraints,
          video: hasCamera ? currentConstraints.video : false,
          audio: hasMicrophone ? currentConstraints.audio : false,
        })
      }
      catch {
        streamRef.current = null
        granted = false
      }
      void update()
      permissionGrantedRef.current = granted
      setPermissionGranted(granted)
    }
    else {
      permissionGrantedRef.current = true
      setPermissionGranted(true)
    }

    return permissionGrantedRef.current
  }, [queryPermissionStatus, update])

  // Initial enumeration + `devicechange` listener + optional permission
  // request, once supported (upstream: `if (isSupported.value)` setup block +
  // `useEventListener(navigator.mediaDevices, 'devicechange', update)`).
  useEffect(() => {
    if (!isSupported)
      return

    const mediaDevices = navigatorRef.current?.mediaDevices
    if (!mediaDevices)
      return

    const onDeviceChange = () => {
      void update()
    }
    mediaDevices.addEventListener('devicechange', onDeviceChange, { passive: true })
    void update()
    if (requestPermissions)
      void ensurePermissions()

    return () => {
      mediaDevices.removeEventListener('devicechange', onDeviceChange)
    }
  }, [isSupported, requestPermissions, update, ensurePermissions])

  const videoInputs = useMemo(() => devices.filter(device => device.kind === 'videoinput'), [devices])
  const audioInputs = useMemo(() => devices.filter(device => device.kind === 'audioinput'), [devices])
  const audioOutputs = useMemo(() => devices.filter(device => device.kind === 'audiooutput'), [devices])

  return {
    devices,
    videoInputs,
    audioInputs,
    audioOutputs,
    isSupported,
    permissionGranted,
    ensurePermissions,
    onUpdated,
  }
}
