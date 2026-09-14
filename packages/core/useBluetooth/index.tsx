import type { ConfigurableNavigator } from '../useUserMedia'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSupported } from '../useSupported'

// ---------------------------------------------------------------------------
// Minimal local typings for the Web Bluetooth API.
//
// The Web Bluetooth API is not part of the TypeScript DOM lib (checked
// against TS 5.9 `lib.dom.d.ts`), so the subset of types used by this hook
// (and commonly consumed through its return values) is declared here,
// mirroring the upstream `@vueuse/core` types that rely on the ambient DOM
// types. The shapes follow the W3C Web Bluetooth spec:
// https://webbluetoothcg.github.io/web-bluetooth/
// ---------------------------------------------------------------------------

/**
 * A Bluetooth service UUID — either a 16/32-bit number or a canonical 128-bit UUID string.
 */
export type BluetoothServiceUUID = string | number

/**
 * A filter for the device chooser: restrict devices by advertised services, a name or a name
 * prefix.
 */
export interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[]
  name?: string
  namePrefix?: string
}

/**
 * Options accepted by `Bluetooth.requestDevice`.
 */
export interface BluetoothRequestDeviceOptions {
  acceptAllDevices?: boolean
  filters?: BluetoothLEScanFilter[]
  optionalServices?: BluetoothServiceUUID[]
}

/**
 * The `navigator.bluetooth` entry point of the Web Bluetooth API.
 */
export interface Bluetooth {
  requestDevice: (options?: BluetoothRequestDeviceOptions) => Promise<BluetoothDevice>
  getAvailability: () => Promise<boolean>
}

export interface BluetoothCharacteristicProperties {
  readonly broadcast: boolean
  readonly read: boolean
  readonly writeWithoutResponse: boolean
  readonly write: boolean
  readonly notify: boolean
  readonly indicate: boolean
  readonly authenticatedSignedWrites: boolean
  readonly reliableWrite: boolean
  readonly writableAuxiliaries: boolean
}

export interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly service: BluetoothRemoteGATTService
  readonly uuid: string
  readonly properties: BluetoothCharacteristicProperties
  readonly value: DataView
  getDescriptor: (uuid: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTDescriptor>
  getDescriptors: (uuid?: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTDescriptor[]>
  readValue: () => Promise<DataView>
  writeValue: (value: BufferSource) => Promise<void>
  writeValueWithResponse: (value: BufferSource) => Promise<void>
  writeValueWithoutResponse: (value: BufferSource) => Promise<void>
  startNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>
}

export interface BluetoothRemoteGATTDescriptor extends EventTarget {
  readonly characteristic: BluetoothRemoteGATTCharacteristic
  readonly uuid: string
  readonly value: DataView
  readValue: () => Promise<DataView>
  writeValue: (value: BufferSource) => Promise<void>
}

export interface BluetoothRemoteGATTService extends EventTarget {
  readonly device: BluetoothDevice
  readonly uuid: string
  readonly isPrimary: boolean
  getCharacteristic: (characteristic: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics: (characteristic?: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTCharacteristic[]>
  getIncludedService: (service: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTService>
  getIncludedServices: (service?: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTService[]>
}

export interface BluetoothRemoteGATTServer {
  readonly connected: boolean
  readonly device: BluetoothDevice
  connect: () => Promise<BluetoothRemoteGATTServer>
  disconnect: () => void
  getPrimaryService: (service: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTService>
  getPrimaryServices: (service?: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTService[]>
}

export interface BluetoothDevice extends EventTarget {
  readonly id: string
  readonly name?: string
  readonly gatt?: BluetoothRemoteGATTServer
  readonly connected?: boolean
  readonly watchingAdvertisements: boolean
  forget: () => Promise<void>
  watchAdvertisements: () => Promise<void>
  unwatchAdvertisements: () => void
}

/** `Navigator` narrowed with the (non-ambient) `bluetooth` member. */
type BluetoothNavigator = Navigator & { bluetooth: Bluetooth }

export interface UseBluetoothRequestDeviceOptions {
  /**
   * An array of `BluetoothLEScanFilter`s. This filter consists of an array of
   * `BluetoothServiceUUID`s, a `name` parameter, and a `namePrefix` parameter.
   */
  filters?: BluetoothLEScanFilter[] | undefined
  /**
   * An array of `BluetoothServiceUUID`s.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTService/uuid
   */
  optionalServices?: BluetoothServiceUUID[] | undefined
}

export interface UseBluetoothOptions extends UseBluetoothRequestDeviceOptions, ConfigurableNavigator {
  /**
   * A boolean value indicating that the requesting script can accept all Bluetooth devices. The
   * default is false.
   *
   * !! This may result in a bunch of unrelated devices being shown in the chooser and energy being
   * wasted as there are no filters. Use it with caution.
   *
   * @default false
   */
  acceptAllDevices?: boolean
}

export interface UseBluetoothReturn {
  /**
   * Whether the Web Bluetooth API is available in the current environment. `false` during render
   * and on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * Whether a device is currently connected.
   */
  isConnected: boolean
  /**
   * The connected Bluetooth device.
   */
  device: BluetoothDevice | undefined
  /**
   * Requests a Bluetooth device. Must be called from a user gesture — it opens the browser's native
   * device chooser. Resolves without picking a device when the API is unsupported, and stores any
   * rejection in `error`.
   */
  requestDevice: () => Promise<void>
  /**
   * The GATT server for the connected device.
   */
  server: BluetoothRemoteGATTServer | undefined
  /**
   * Any error that occurred during device request or connection.
   */
  error: unknown | null
}

/**
 * Map from @vueuse/core `useBluetooth`
 * (`source/vueuse/packages/core/useBluetooth/`).
 *
 * @see https://vueuse.org/core/useBluetooth/
 * @param options
 *
 * @example
 * const { isSupported, isConnected, device, requestDevice, server, error } = useBluetooth({ acceptAllDevices: true })
 */
export function useBluetooth(options: UseBluetoothOptions = {}): UseBluetoothReturn {
  const {
    acceptAllDevices = false,
    filters,
    optionalServices,
    navigator: customNavigator,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [device, setDevice] = useState<BluetoothDevice | undefined>(undefined)
  const [server, setServer] = useState<BluetoothRemoteGATTServer | undefined>(undefined)
  const [error, setError] = useState<unknown | null>(null)

  // The options are evaluated once during render (upstream reads them once in
  // setup); latest-value refs keep `requestDevice` referentially stable while
  // always using the newest options/navigator.
  const navigatorRef = useRef<Navigator | undefined>(
    customNavigator ?? (typeof navigator === 'undefined' ? undefined : navigator),
  )
  navigatorRef.current = customNavigator ?? (typeof navigator === 'undefined' ? undefined : navigator)
  const optionsRef = useRef({ acceptAllDevices, filters, optionalServices })
  optionsRef.current = { acceptAllDevices, filters, optionalServices }
  const deviceRef = useRef<BluetoothDevice | undefined>(device)
  deviceRef.current = device

  const isSupported = useSupported(() => {
    const nav = navigatorRef.current
    return Boolean(nav && 'bluetooth' in nav)
  })
  const isSupportedRef = useRef(isSupported)
  isSupportedRef.current = isSupported

  const reset = useCallback(() => {
    setIsConnected(false)
    setDevice(undefined)
    setServer(undefined)
  }, [])

  const requestDevice = useCallback(async (): Promise<void> => {
    // This function can only be called if the Bluetooth API is supported:
    if (!isSupportedRef.current)
      return

    // Reset any errors we currently have:
    setError(null)

    // If filters are specified, we must not accept all devices:
    const { acceptAllDevices: acceptAll, filters: filtersOption, optionalServices: servicesOption } = optionsRef.current
    const nav = navigatorRef.current as BluetoothNavigator | undefined
    if (!nav?.bluetooth)
      return

    try {
      const nextDevice = await nav.bluetooth.requestDevice({
        acceptAllDevices: filtersOption && filtersOption.length > 0 ? false : acceptAll,
        filters: filtersOption,
        optionalServices: servicesOption,
      })
      setDevice(nextDevice)
    }
    catch (err) {
      setError(err)
    }
  }, [])

  // Auto-connect to the device's GATT server whenever `device` changes
  // (upstream `watch(device, () => connectToBluetoothGATTServer())`).
  useEffect(() => {
    // Reset any errors we currently have *before* guarding on the GATT
    // server (upstream `connectToBluetoothGATTServer` clears the error
    // unconditionally), so a reset (device becomes undefined) or a
    // gatt-less device also clears a stale error.
    setError(null)

    if (!device?.gatt)
      return

    let cancelled = false
    void device.gatt.connect()
      .then((gattServer) => {
        if (cancelled)
          return
        setServer(gattServer)
        setIsConnected(gattServer.connected)
      })
      .catch((err) => {
        if (!cancelled)
          setError(err)
      })

    return () => {
      cancelled = true
    }
  }, [device])

  // Listen for the device disconnecting, re-bound per device (upstream
  // `useEventListener(device, 'gattserverdisconnected', reset, ...)`).
  useEffect(() => {
    if (!device)
      return
    const onDisconnect = () => reset()
    device.addEventListener('gattserverdisconnected', onDisconnect, { passive: true, once: true })
    return () => {
      device.removeEventListener('gattserverdisconnected', onDisconnect)
    }
  }, [device, reset])

  // Disconnect the GATT server when the component unmounts (upstream
  // `tryOnScopeDispose(() => { device.value?.gatt?.disconnect() })`).
  useEffect(() => {
    return () => {
      if (deviceRef.current)
        deviceRef.current.gatt?.disconnect()
    }
  }, [])

  return {
    isSupported,
    isConnected,
    device,
    requestDevice,
    server,
    error,
  }
}
