import type { ConfigurableWindow } from '@reause/shared'
import type { ElementTarget } from '../useResizeObserver'
import { deepEqual, isObject, objectOmit } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'
import { useEventListener } from '../useEventListener'
import { useRafFn } from '../useRafFn'

/**
 * Options for `useAnimate`: the platform `KeyframeAnimationOptions` (`duration` / `easing` /
 * `iterations` / `direction` / `fill`...) plus the VueUse-specific knobs — `immediate`,
 * `commitStyles`, `persist`, `playbackRate`, `onReady`, `onError` — and a custom `window` instance,
 * e.g. working with iframes or in testing environments.
 */
export interface UseAnimateOptions extends KeyframeAnimationOptions, ConfigurableWindow {
  /**
   * Will automatically run play when `useAnimate` is used
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Whether to commit the end styling state of an animation to the element being animated. In
   * general, you should use `fill` option with this.
   *
   * @default false
   */
  commitStyles?: boolean
  /**
   * Whether to persist the animation
   *
   * @default false
   */
  persist?: boolean
  /**
   * Initial `playbackRate` of the animation
   *
   * @default 1
   */
  playbackRate?: number
  /**
   * Executed after animation initialization
   */
  onReady?: (animate: Animation) => void
  /**
   * Callback when error is caught.
   */
  onError?: (e: unknown) => void
}

/**
 * Animation keyframes — an array of keyframe objects, a keyframe object, or `null` (see [Keyframe
 * Formats](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Keyframe_Formats)),
 * as a plain value.
 */
export type UseAnimateKeyframes = Keyframe[] | PropertyIndexedKeyframes | null

/**
 * Store of the animation attributes kept in sync from the platform `Animation` object on every
 * animation frame while the hook is running.
 */
type AnimateStore = Pick<Animation, 'startTime' | 'currentTime' | 'timeline' | 'playbackRate' | 'pending' | 'playState' | 'replaceState'>

/**
 * Field-by-field equality of two animation stores. Upstream writes the platform attributes one by
 * one into a `shallowReactive` store, which only triggers when a value actually changes — the React
 * port must compare before publishing, otherwise every frame re-renders (see the frame loop).
 */
function isSameStore(a: AnimateStore, b: AnimateStore): boolean {
  return a.startTime === b.startTime
    && a.currentTime === b.currentTime
    && a.timeline === b.timeline
    && a.playbackRate === b.playbackRate
    && a.pending === b.pending
    && a.playState === b.playState
    && a.replaceState === b.replaceState
}

/**
 * Return of `useAnimate`. Mirrors the upstream `UseAnimateReturn` member by member; the upstream
 * Vue refs become plain values:
 * - `isSupported` is `boolean` state;
 * - `animate` is the `Animation` object or `undefined`;
 * - the state members `pending` / `playState` / `replaceState` / `startTime` / `currentTime` /
 * `timeline` / `playbackRate` are plain values re-rendered on every animation frame while the
 * animation runs — upstream's `ComputedRef`s / `WritableComputedRef`s have no setter here, so
 * seeking (`animate.currentTime =...`) goes through the returned `animate` object directly;
 * - the controls `play` / `pause` / `reverse` / `finish` / `cancel` are stable.
 */
export interface UseAnimateReturn {
  /**
   * Whether the current environment supports the Web Animations API (`Element.animate`), probed on
   * the resolved `window` option. Starts `false` and settles in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * The `Animation` instance created on the target element, `undefined` while no target is mounted
   * or the API is unsupported.
   */
  animate: Animation | undefined
  /** Start or resume playing the animation. */
  play: () => void
  /** Pause the animation. */
  pause: () => void
  /** Reverse the playback direction of the animation. */
  reverse: () => void
  /** Seek the animation to its end. */
  finish: () => void
  /** Abort the animation. */
  cancel: () => void
  /** Whether the animation is waiting for a pending play/pause task. */
  pending: boolean
  /** `idle` | `running` | `paused` | `finished` playback state. */
  playState: AnimationPlayState
  /** `active` | `removed` | `persisted` replace state. */
  replaceState: AnimationReplaceState
  /** The scheduled time when the animation's playback began (`null` until then). */
  startTime: number | CSSNumberish | null
  /** The current time of the animation, pace-set by its timeline. */
  currentTime: CSSNumberish | null
  /** The timeline this animation is running on. */
  timeline: AnimationTimeline | null
  /** The current playback rate of the animation. */
  playbackRate: number
}

/**
 * Upstream `useSupported(() => window && HTMLElement && 'animate' in HTMLElement.prototype)` gates
 * the probe on the configurable `window` but reads the global `HTMLElement` prototype; the same
 * probe runs in the mount effect here, re-running when the resolved window changes.
 */
function supportsElementAnimate(win: Window | undefined): boolean {
  return Boolean(win) && typeof HTMLElement !== 'undefined' && 'animate' in HTMLElement.prototype
}

/**
 * Map from @vueuse/core `useAnimate`
 * (`source/vueuse/packages/core/useAnimate/`).
 *
 * @example
 * const el = useRef<HTMLSpanElement>(null)
 * const { isSupported, play, pause, reverse, playState, currentTime } =
 *   useAnimate(el, { transform: 'rotate(360deg)' }, 1000)
 */
export function useAnimate(
  target: ElementTarget,
  keyframes: UseAnimateKeyframes,
  options?: number | UseAnimateOptions,
): UseAnimateReturn {
  // Options handling mirrors upstream: a number is the duration, an object
  // is split into the VueUse-specific config and the platform animation
  // options passed to `Element.animate` / `KeyframeEffect`.
  const isOptionsObject = isObject(options)
  const config: UseAnimateOptions = isOptionsObject ? options : { duration: options }
  const animateOptions: number | KeyframeAnimationOptions | undefined = isOptionsObject
    ? objectOmit(options, ['window', 'immediate', 'commitStyles', 'persist', 'playbackRate', 'onReady', 'onError'])
    : options

  const {
    window: windowOption,
    immediate = true,
    commitStyles = false,
    persist = false,
    playbackRate: _playbackRate = 1,
    onReady,
    onError = (e: unknown) => {
      console.error(e)
    },
  } = config

  const win = windowOption ?? (typeof window === 'undefined' ? undefined : window)

  // Latest-value refs synced each render so callbacks and effects stay
  // referentially stable while always reading the newest target / keyframes /
  // options (house pattern).
  const targetRef = useRef(target)
  targetRef.current = target
  const keyframesRef = useRef(keyframes)
  keyframesRef.current = keyframes
  const animateOptionsRef = useRef(animateOptions)
  animateOptionsRef.current = animateOptions
  const immediateRef = useRef(immediate)
  immediateRef.current = immediate
  const commitStylesRef = useRef(commitStyles)
  commitStylesRef.current = commitStyles
  const persistRef = useRef(persist)
  persistRef.current = persist
  const windowRef = useRef(win)
  windowRef.current = win
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const [isSupported, setIsSupported] = useState(false)
  const supportedRef = useRef(false)

  const [animate, setAnimate] = useState<Animation | undefined>(undefined)
  const animateRef = useRef<Animation | undefined>(undefined)

  const [store, setStore] = useState<AnimateStore>({
    startTime: null,
    currentTime: null,
    timeline: null,
    playbackRate: _playbackRate,
    pending: false,
    playState: immediate ? 'idle' : 'paused',
    replaceState: 'active',
  })

  // Sync the platform `Animation` attributes into state on every frame while
  // the loop runs (upstream: `useRafFn` + `shallowReactive` store). The frame
  // loop only ever runs while an animation is playing.
  const { resume: resumeFrame, pause: pauseFrame } = useRafFn(() => {
    const animation = animateRef.current
    if (!animation)
      return
    const next: AnimateStore = {
      startTime: animation.startTime,
      currentTime: animation.currentTime,
      timeline: animation.timeline,
      playbackRate: animation.playbackRate,
      pending: animation.pending,
      playState: animation.playState,
      replaceState: animation.replaceState,
    }
    // Upstream's `shallowReactive` store only triggers on a changed value;
    // republishing an equal store object on every frame would re-render per
    // frame, which starves `act()` (WebKit) and is pure churn elsewhere.
    setStore(prev => isSameStore(prev, next) ? prev : next)
  }, { immediate: false })

  const syncResume = useCallback(() => {
    if (supportedRef.current)
      resumeFrame()
  }, [resumeFrame])

  // Schedule the pause through a frame like upstream so a queued sync frame
  // writes the final state (e.g. `finished`) before the loop actually stops.
  const syncPause = useCallback(() => {
    const win = windowRef.current
    if (supportedRef.current && win)
      win.requestAnimationFrame(pauseFrame)
  }, [pauseFrame])

  // Create the animation when missing, apply the static options, and start or
  // hold the loop (upstream `update()`). Reads everything from refs so the
  // callback is stable.
  const update = useCallback((init?: boolean) => {
    const el = unrefElement(targetRef.current)
    if (!supportedRef.current || !el)
      return

    if (!animateRef.current) {
      const animation = el.animate(
        keyframesRef.current ?? null,
        animateOptionsRef.current,
      )
      animateRef.current = animation
      setAnimate(animation)
    }

    if (persistRef.current)
      animateRef.current.persist()
    if (_playbackRate !== 1)
      animateRef.current.playbackRate = _playbackRate

    if (init && !immediateRef.current)
      animateRef.current.pause()
    else
      syncResume()

    onReadyRef.current?.(animateRef.current)
  }, [syncResume])

  const play = useCallback(() => {
    if (animateRef.current) {
      try {
        animateRef.current.play()
        syncResume()
      }
      catch (e) {
        syncPause()
        onErrorRef.current(e)
      }
    }
    else {
      update()
    }
  }, [syncResume, syncPause, update])

  const pause = useCallback(() => {
    try {
      animateRef.current?.pause()
      syncPause()
    }
    catch (e) {
      onErrorRef.current(e)
    }
  }, [syncPause])

  const reverse = useCallback(() => {
    if (!animateRef.current)
      update()
    try {
      animateRef.current?.reverse()
      syncResume()
    }
    catch (e) {
      syncPause()
      onErrorRef.current(e)
    }
  }, [syncResume, syncPause, update])

  const finish = useCallback(() => {
    try {
      animateRef.current?.finish()
      syncPause()
    }
    catch (e) {
      onErrorRef.current(e)
    }
  }, [syncPause])

  const cancel = useCallback(() => {
    try {
      animateRef.current?.cancel()
      syncPause()
    }
    catch (e) {
      onErrorRef.current(e)
    }
  }, [syncPause])

  // Feature detection (upstream: `useSupported` gated on the resolved
  // `window` option, evaluated in `tryOnMounted`). The ref mirror lets
  // `update` / `sync*` gate synchronously in the same effect run.
  useEffect(() => {
    const supported = supportsElementAnimate(win)
    supportedRef.current = supported
    setIsSupported(supported)
  }, [win])

  // Resolved target element, recomputed every render so a changed `current`
  // re-runs the effect below.
  const targetEl = unrefElement(target)

  // upstream `watch(() => unrefElement(target))` + `tryOnMounted(() =>
  // update(true))`: create / refresh the animation when the target element
  // becomes available, drop it when the element goes away.
  useEffect(() => {
    if (targetEl) {
      update(true)
    }
    else {
      animateRef.current = undefined
      setAnimate(undefined)
    }
  }, [targetEl, update])

  // upstream `watch(() => keyframes, ..., { deep: true })`: when the resolved
  // keyframes change, re-apply the animation options and swap the animation's
  // effect onto the target element with the new keyframes. The resolved value
  // is compared with `deepEqual` on every render, so a reordered keyframe
  // object (or any deep-equal reassignment) does not recreate the effect
  // (upstream: a deep watcher). The first run is skipped — the animation is
  // created with the initial keyframes already.
  const resolvedKeyframes = keyframes
  const previousKeyframesRef = useRef(resolvedKeyframes)

  useEffect(() => {
    if (deepEqual(previousKeyframesRef.current, resolvedKeyframes))
      return
    previousKeyframesRef.current = resolvedKeyframes
    if (!animateRef.current)
      return
    update()
    const el = unrefElement(targetRef.current)
    if (el && animateRef.current) {
      animateRef.current.effect = new KeyframeEffect(
        el,
        resolvedKeyframes ?? null,
        animateOptionsRef.current,
      )
    }
  })

  // Round-trip the animation events into the store loop and commit the end
  // styling state when requested (upstream `useEventListener` on the
  // `Animation`; the ref's `.current` re-binds after the animation appears).
  const listenerOptions = { passive: true }
  useEventListener(animateRef, ['cancel', 'finish', 'remove'], syncPause, listenerOptions)
  useEventListener(animateRef, 'finish', () => {
    if (commitStylesRef.current)
      animateRef.current?.commitStyles()
  }, listenerOptions)

  // Cancel the animation on unmount (upstream: `tryOnScopeDispose(cancel)`).
  useEffect(() => () => {
    cancel()
  }, [cancel])

  const { pending, playState, replaceState } = store
  const { startTime, currentTime, timeline } = store
  const playbackRate = store.playbackRate

  return {
    isSupported,
    animate,

    // actions
    play,
    pause,
    reverse,
    finish,
    cancel,

    // state
    pending,
    playState,
    replaceState,
    startTime,
    currentTime,
    timeline,
    playbackRate,
  }
}
