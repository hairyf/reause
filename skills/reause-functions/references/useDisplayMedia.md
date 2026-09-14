---
category: Sensors
related: useUserMedia
---

# useDisplayMedia

Reactive [`mediaDevices.getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) streaming

## Usage

```tsx
import { useDisplayMedia } from '@reause/core'

const { stream, start } = useDisplayMedia()
start()

const videoRef = useRef<HTMLVideoElement>(null)
useEffect(() => {
  // preview on a video element
  videoRef.current.srcObject = stream ?? null
}, [stream])
```

## Type Declarations

```ts
/**
 * Options for `useDisplayMedia`.
 */
export interface UseDisplayMediaOptions extends ConfigurableNavigator {
  /**
   * If the stream is enabled. With an initial `true` the stream is acquired automatically once
   * mounted (and supported).
   * @default false
   */
  enabled?: boolean
  /**
   * If the stream video media constraints
   */
  video?: boolean | MediaTrackConstraints | undefined
  /**
   * If the stream audio media constraints
   */
  audio?: boolean | MediaTrackConstraints | undefined
}
/**
 * Return type of `useDisplayMedia`.
 */
export interface UseDisplayMediaReturn {
  isSupported: boolean
  stream: MediaStream | undefined
  start: () => Promise<MediaStream | undefined>
  stop: () => void
  /**
   * Whether the stream is currently enabled (acquired). A writable control mirroring upstream's
   * `enabled` ref — read it to render the current state, write it through `setEnabled`.
   */
  enabled: boolean
  /**
   * Set the `enabled` control: `setEnabled(true)` acquires the stream (like `start()`),
   * `setEnabled(false)` stops it (like `stop()`). Accepts the React functional-updater form
   * (`setEnabled(prev => !prev)`).
   */
  setEnabled: Dispatch<SetStateAction<boolean>>
}
/**
 * Map from @vueuse/core `useDisplayMedia`
 * (`source/vueuse/packages/core/useDisplayMedia/`).
 *
 * @see https://vueuse.org/useDisplayMedia
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const { stream, start } = useDisplayMedia()
 * start()
 * // preview on a video element
 * videoEl.srcObject = stream
 */
export declare function useDisplayMedia(
  options?: UseDisplayMediaOptions,
): UseDisplayMediaReturn
```
