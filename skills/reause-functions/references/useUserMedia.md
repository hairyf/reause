---
category: Sensors
related: useDevicesList, usePermission
---

# useUserMedia

Streaming via [`mediaDevices.getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

## Usage

```tsx
import { useUserMedia } from '@reause/core'
import { useEffect, useRef } from 'react'

const { stream, start } = useUserMedia()

const videoRef = useRef<HTMLVideoElement>(null)
useEffect(() => {
  // acquire the stream once mounted
  start()
}, [])

useEffect(() => {
  // preview on a video element
  videoRef.current.srcObject = stream ?? null
}, [stream])
```

### Devices

```tsx
import { useDevicesList, useUserMedia } from '@reause/core'

const {
  videoInputs: cameras,
  audioInputs: microphones,
} = useDevicesList({
  requestPermissions: true,
})
const currentCamera = cameras[0]?.deviceId
const currentMicrophone = microphones[0]?.deviceId

const { stream } = useUserMedia({
  constraints: {
    video: { deviceId: currentCamera },
    audio: { deviceId: currentMicrophone },
  },
})
```

## Type Declarations

```ts
/**
 * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
 */
export interface ConfigurableNavigator {
  navigator?: Navigator
}
/**
 * Options for `useUserMedia`.
 */
export interface UseUserMediaOptions extends ConfigurableNavigator {
  /**
   * If the stream is enabled. With an initial `true` the stream is acquired automatically once
   * mounted (and supported).
   * @default false
   */
  enabled?: boolean
  /**
   * Recreate the stream when the `constraints` option changed while streaming.
   * @default true
   */
  autoSwitch?: boolean
  /**
   * MediaStreamConstraints to be applied to the requested MediaStream. When provided, its
   * `video`/`audio` members are passed to `getUserMedia` as-is.
   * @default {}
   */
  constraints?: MediaStreamConstraints
}
/**
 * Return type of `useUserMedia`.
 */
export interface UseUserMediaReturn {
  isSupported: boolean
  stream: MediaStream | undefined
  start: () => Promise<MediaStream | undefined>
  stop: () => void
  restart: () => Promise<MediaStream | undefined>
  constraints: MediaStreamConstraints | undefined
  enabled: boolean
  autoSwitch: boolean
}
/**
 * Map from @vueuse/core `useUserMedia`
 * (`source/vueuse/packages/core/useUserMedia/`).
 *
 * @example
 * const { stream, start } = useUserMedia()
 * start()
 * // preview on a video element
 * videoEl.srcObject = stream
 */
export declare function useUserMedia(
  options?: UseUserMediaOptions,
): UseUserMediaReturn
```
