import { useCallback, useEffect, useRef, useState } from 'react'

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
 * (`source/vueuse/packages/core/useUserMedia/`), which wraps
 * `mediaDevices.getUserMedia` into a stream ref with `start`/`stop`/ `restart` controls and an
 * `enabled` flag whose watcher auto-starts and auto-stops the stream.
 *
 * React divergences:
 * - the Vue `stream`/`enabled`/`isSupported` refs become plain state values;
 *   `start`/`stop`/`restart` are stable callbacks reading the latest state
 *   and options through refs;
 * - the writable `enabled` ref becomes state mutated through `start`/`stop`;
 *   `autoSwitch` and `constraints` are read-only snapshots of the latest
 *   options (re-render with new options to change them);
 * - the supported check runs in a mount effect, so `isSupported` stays
 *   `false` during render and on the server (SSR-safe);
 * - upstream deep-watches its `constraints` ref: here a changed
 *   `constraints` option (compared structurally, since React hands the hook
 *   new option objects) recreates the stream while streaming when
 *   `autoSwitch` is on;
 * - concurrent `start()` calls share one pending acquisition (React effects
 *   can re-run; upstream's watcher fires once), while `stop()`/`restart()`
 *   drop it so a late resolve cannot re-enable a stream that was stopped;
 * - `tryOnScopeDispose(stop)` becomes an unmount cleanup.
 *
 * @example
 * const { stream, start } = useUserMedia()
 * start()
 * // preview on a video element
 * videoEl.srcObject = stream
 */
export function useUserMedia(options: UseUserMediaOptions = {}): UseUserMediaReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [stream, setStream] = useState<MediaStream | undefined>(undefined)
  const [enabled, setEnabled] = useState(options.enabled ?? false)

  const constraints = options.constraints
  const autoSwitch = options.autoSwitch ?? true

  // Latest-value refs keeping the stable callbacks fresh without changing
  // their identities across renders.
  const optionsRef = useRef(options)
  optionsRef.current = options
  const isSupportedRef = useRef(false)
  const streamRef = useRef<MediaStream | undefined>(undefined)
  const pendingRef = useRef<Promise<MediaStream | undefined> | undefined>(undefined)
  const lastConstraintsRef = useRef<MediaStreamConstraints | undefined>(constraints)

  const updateStream = useCallback((value: MediaStream | undefined) => {
    streamRef.current = value
    setStream(value)
  }, [])

  const updateEnabled = useCallback((value: boolean) => {
    setEnabled(value)
  }, [])

  const resolveNavigator = useCallback((): Navigator | undefined => {
    return optionsRef.current.navigator ?? (typeof navigator === 'undefined' ? undefined : navigator)
  }, [])

  const getDeviceOptions = useCallback((type: 'video' | 'audio') => {
    const current = optionsRef.current.constraints
    if (!current)
      return undefined
    return type === 'video' ? current.video || false : current.audio || false
  }, [])

  const start = useCallback((): Promise<MediaStream | undefined> => {
    // Already streaming: mirror upstream and hand back the live stream.
    if (streamRef.current) {
      updateEnabled(true)
      return Promise.resolve(streamRef.current)
    }
    // Share a single acquisition while one is pending.
    if (pendingRef.current)
      return pendingRef.current
    if (!isSupportedRef.current)
      return Promise.resolve(undefined)
    const nav = resolveNavigator()
    if (!nav?.mediaDevices?.getUserMedia)
      return Promise.resolve(undefined)
    const acquisition = nav.mediaDevices.getUserMedia({
      video: getDeviceOptions('video'),
      audio: getDeviceOptions('audio'),
    }).then((mediaStream) => {
      // Apply only while this acquisition is still the current one — a
      // `stop()`/`restart()` in between clears the pending ref, so a late
      // resolve must not re-enable a stream we intentionally stopped.
      if (pendingRef.current === acquisition) {
        updateStream(mediaStream)
        updateEnabled(true)
      }
      return mediaStream
    })
    pendingRef.current = acquisition
    const settle = () => {
      if (pendingRef.current === acquisition)
        pendingRef.current = undefined
    }
    acquisition.then(settle, settle)
    return acquisition
  }, [getDeviceOptions, resolveNavigator, updateEnabled, updateStream])

  const stop = useCallback((): void => {
    // Drop any in-flight acquisition: a later `start()` must acquire fresh
    // (upstream re-invokes `getUserMedia` while its stream is undefined) and
    // a late resolve must not re-enable (guarded in `start`'s resolve).
    pendingRef.current = undefined
    streamRef.current?.getTracks().forEach(track => track.stop())
    updateStream(undefined)
    updateEnabled(false)
  }, [updateEnabled, updateStream])

  const restart = useCallback((): Promise<MediaStream | undefined> => {
    // Upstream restart stops the tracks without flipping `enabled`. Drop any
    // in-flight acquisition so the re-acquisition starts fresh.
    pendingRef.current = undefined
    streamRef.current?.getTracks().forEach(track => track.stop())
    updateStream(undefined)
    return start()
  }, [start, updateStream])

  // Mirror of upstream's supported check: evaluated after mount, stays
  // `false` on the server.
  useEffect(() => {
    const nav = resolveNavigator()
    const supported = Boolean(nav?.mediaDevices?.getUserMedia)
    isSupportedRef.current = supported
    setIsSupported(supported)
  }, [resolveNavigator])

  // Mirror of upstream's `watch(enabled)`: start while enabled, stop when
  // not. Re-runs once `isSupported` settles after mount.
  useEffect(() => {
    if (enabled)
      void start()
    else
      stop()
  }, [enabled, isSupported, start, stop])

  // Mirror of upstream's deep `constraints` watcher: recreate the stream
  // when the constraints actually changed while streaming and `autoSwitch`
  // is on. The structural comparison ignores equal-but-new option objects.
  useEffect(() => {
    const previous = lastConstraintsRef.current
    if (previous === constraints)
      return
    lastConstraintsRef.current = constraints
    if (
      previous !== undefined
      && constraints !== undefined
      && JSON.stringify(previous) === JSON.stringify(constraints)
    ) {
      return
    }
    if (autoSwitch && streamRef.current)
      void restart()
  }, [autoSwitch, constraints, restart])

  // Mirror of upstream's `tryOnScopeDispose(stop)`.
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
    restart,
    constraints,
    enabled,
    autoSwitch,
  }
}
