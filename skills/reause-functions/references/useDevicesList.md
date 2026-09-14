---
category: Sensors
---

# useDevicesList

Reactive [`enumerateDevices`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices) listing available input/output devices

## Usage

```tsx
import { useDevicesList } from '@reause/core'

const {
  devices,
  videoInputs: cameras,
  audioInputs: microphones,
  audioOutputs: speakers,
} = useDevicesList()
```

## Requesting Permissions

To request permissions, use the `ensurePermissions` method.

```tsx
import { useDevicesList } from '@reause/core'

const {
  ensurePermissions,
  permissionGranted,
} = useDevicesList()

await ensurePermissions()
console.log(permissionGranted)
```

Call it from an event handler or an effect — never from render:

```tsx
function Component() {
  const { ensurePermissions, permissionGranted } = useDevicesList()

  return (
    <button type="button" onClick={() => void ensurePermissions()}>
      {permissionGranted ? 'Granted' : 'Request permissions'}
    </button>
  )
}
```

## Type Declarations

```ts
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
   * `useListener` protocol `(fn) => { off }`.
   */
  onUpdated: (fn: (devices: MediaDeviceInfo[]) => void) => {
    off: () => void
  }
}
/**
 * Map from @vueuse/core `useDevicesList`
 * (`source/vueuse/packages/core/useDevicesList/`).
 *
 * @example
 * const { devices, videoInputs: cameras, audioInputs: microphones, audioOutputs: speakers } = useDevicesList()
 */
export declare function useDevicesList(
  options?: UseDevicesListOptions,
): UseDevicesListReturn
```
