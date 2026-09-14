import type { Dispatch, SetStateAction } from 'react'
import type { ConfigurableNavigator } from '../useUserMedia'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSupported } from '../useSupported'

/**
 * Resolve the effective `navigator` from the `navigator` option or the global one — the single
 * source of truth shared by the support probe and `start()` (upstream resolves once via `const {
 * navigator = defaultNavigator } = options`).
 */
function resolveNavigator(custom?: Navigator | undefined): Navigator | undefined {
  return custom ?? (typeof navigator === 'undefined' ? undefined : navigator)
}

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
export function useDisplayMedia(options: UseDisplayMediaOptions = {}): UseDisplayMediaReturn {
  const [stream, setStream] = useState<MediaStream | undefined>(undefined)
  // upstream: `enabled = shallowRef(options.enabled ?? false)` — the option
  // seeds the writable control exactly once, later changes to the option are
  // ignored (use `setEnabled` to control it)
  const [enabled, setEnabled] = useState<boolean>(() => options.enabled ?? false)
  const isSupported = useSupported(() => {
    return Boolean(resolveNavigator(options.navigator)?.mediaDevices?.getDisplayMedia)
  })

  // Latest-value refs keeping the stable callbacks fresh without changing
  // their identities across renders.
  const optionsRef = useRef(options)
  optionsRef.current = options
  const isSupportedRef = useRef(false)
  isSupportedRef.current = isSupported
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const pendingRef = useRef<Promise<MediaStream | undefined> | undefined>(undefined)

  const updateStream = useCallback((value: MediaStream | undefined) => {
    streamRef.current = value
    setStream(value)
  }, [])

  const start = useCallback((): Promise<MediaStream | undefined> => {
    // Already streaming: mirror upstream (`_start` bails on an existing
    // stream, then `start()` sets `enabled.value = true`) and hand back the
    // live stream.
    if (streamRef.current) {
      setEnabled(true)
      return Promise.resolve(streamRef.current)
    }
    // Share a single acquisition while one is pending.
    if (pendingRef.current)
      return pendingRef.current
    if (!isSupportedRef.current)
      return Promise.resolve(undefined)
    const nav = resolveNavigator(optionsRef.current.navigator)
    if (!nav?.mediaDevices?.getDisplayMedia)
      return Promise.resolve(undefined)
    const acquisition = nav.mediaDevices.getDisplayMedia({
      audio: optionsRef.current.audio,
      video: optionsRef.current.video,
    }).then((mediaStream) => {
      updateStream(mediaStream)
      // mirror upstream's `start()`: a successful acquisition flips `enabled`
      setEnabled(true)
      return mediaStream
    })
    pendingRef.current = acquisition
    const settle = () => {
      pendingRef.current = undefined
    }
    acquisition.then(settle, settle)
    return acquisition
  }, [resolveNavigator, updateStream])

  const stop = useCallback((): void => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    updateStream(undefined)
    // mirror upstream's `stop()`: `enabled.value = false`
    setEnabled(false)
  }, [updateStream])

  // Mirror of upstream's `watch(enabled, ..., { immediate: true })`: the
  // `enabled` control drives `start`/`stop` on every change (mount included,
  // so the `enabled` option acquires the stream automatically once mounted
  // and supported). `isSupported` stays a dependency so an auto-start that
  // first runs before the mount probe resolves re-runs once support is
  // known. The auto-start swallows its rejection (see the header note);
  // manual `start()` calls still propagate errors.
  useEffect(() => {
    if (enabled)
      void start().catch(() => {})
    else
      stop()
  }, [enabled, start, stop, isSupported])

  // Mirror of upstream's per-track `useEventListener(t, 'ended', stop)`: when
  // a track ends natively (e.g. the user stops sharing from the browser UI),
  // stop the whole stream.
  useEffect(() => {
    if (!stream)
      return
    const tracks = stream.getTracks()
    const handleEnded = () => stop()
    tracks.forEach(track => track.addEventListener('ended', handleEnded, { passive: true }))
    return () => {
      tracks.forEach(track => track.removeEventListener('ended', handleEnded))
    }
  }, [stream, stop])

  // Intentional React addition (upstream has no `tryOnScopeDispose(stop)`):
  // the stream is owned by this hook's effects, so unmounting stops the
  // acquired tracks instead of leaving the capture running.
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    isSupported,
    stream,
    start,
    stop,
    enabled,
    setEnabled,
  }
}
