import type { RefObject } from 'react'
import { isObject } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * Many of the jsdoc definitions here are modified version of the documentation from
 * MDN(https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement)
 */

export interface UseMediaSource {
  /**
   * The source url for the media
   */
  src: string

  /**
   * The media codec type
   */
  type?: string

  /**
   * Specifies the media query for the resource's intended media.
   */
  media?: string
}

export interface UseMediaTextTrackSource {
  /**
   * Indicates that the track should be enabled unless the user's preferences indicate that another
   * track is more appropriate
   */
  default?: boolean

  /**
   * How the text track is meant to be used. If omitted the default kind is subtitles.
   */
  kind: TextTrackKind

  /**
   * A user-readable title of the text track which is used by the browser when listing available
   * text tracks.
   */
  label: string

  /**
   * Address of the track (.vtt file). Must be a valid URL. This attribute must be specified and its
   * URL value must have the same origin as the document
   */
  src: string

  /**
   * Language of the track text data. It must be a valid BCP 47 language tag. If the kind attribute
   * is set to subtitles, then srclang must be defined.
   */
  srcLang: string
}

export interface UseMediaControlsOptions {
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   *
   * @default typeof document !== 'undefined' ? document : undefined
   */
  document?: Document

  /**
   * The source for the media, may either be a string, a `UseMediaSource` object, or a list of
   * `UseMediaSource` objects. A read-only value source — pass a plain value.
   */
  src?: string | UseMediaSource | UseMediaSource[]

  /**
   * A list of text tracks for the media. A read-only value source — pass a plain array.
   */
  tracks?: UseMediaTextTrackSource[]
}

export interface UseMediaTextTrack {
  /**
   * The index of the text track
   */
  id: number

  /**
   * The text track label
   */
  label: string

  /**
   * Language of the track text data. It must be a valid BCP 47 language tag. If the kind attribute
   * is set to subtitles, then srclang must be defined.
   */
  language: string

  /**
   * Specifies the display mode of the text track, either `disabled`, `hidden`, or `showing`
   */
  mode: TextTrackMode

  /**
   * How the text track is meant to be used. If omitted the default kind is subtitles.
   */
  kind: TextTrackKind

  /**
   * Indicates the track's in-band metadata track dispatch type.
   */
  inBandMetadataTrackDispatchType: string

  /**
   * A list of text track cues
   */
  cues: TextTrackCueList | null

  /**
   * A list of active text track cues
   */
  activeCues: TextTrackCueList | null
}

/**
 * Target media element accepted by `useMediaControls` — a React ref object (`RefObject`) holding
 * the element (e.g. `useRef<HTMLVideoElement>(null)`, whose `current` is populated after mount),
 * resolved with the shared `unrefElement` — the React analog of upstream's media-element target.
 */
export type UseMediaControlsTarget = RefObject<HTMLMediaElement | null | undefined>

export interface UseMediaControlsReturn {
  currentTime: number
  duration: number
  waiting: boolean
  seeking: boolean
  ended: boolean
  stalled: boolean
  buffered: [number, number][]
  playing: boolean
  rate: number
  // Volume
  volume: number
  muted: boolean
  // Tracks
  tracks: UseMediaTextTrack[]
  selectedTrack: number
  // Picture in Picture
  supportsPictureInPicture: boolean
  isPictureInPicture: boolean
  // Events
  onSourceError: EventHookOn<Event>
  onPlaybackError: EventHookOn<Event>
  // Controls — upstream exposes the writable state as Vue refs
  // (`playing.value = true`, `volume.value = 0.5`, `currentTime.value = 60`,
  // ...); React state is not writable, so every write becomes a control method.
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  mute: () => void
  unmute: () => void
  toggleMute: () => void
  setRate: (rate: number) => void
  enableTrack: (track: number | UseMediaTextTrack, disableTracks?: boolean) => void
  disableTrack: (track?: number | UseMediaTextTrack) => void
  togglePictureInPicture: () => Promise<PictureInPictureWindow | void>
}

type EventHookOn<T = any> = (fn: (param: T) => void) => () => void

/**
 * Minimal event emitter — inlined from @vueuse/shared `createEventHook` (not yet ported to
 * @reause/shared, so kept local with attribution).
 */
function createEventHook<T = any>() {
  const fns: Array<(param: T) => void> = []

  const off = (fn: (param: T) => void) => {
    const index = fns.indexOf(fn)
    if (index !== -1)
      fns.splice(index, 1)
  }

  const on = (fn: (param: T) => void) => {
    fns.push(fn)
    return () => off(fn)
  }

  const trigger = (param: T) => {
    fns.forEach(fn => fn(param))
  }

  return { on, off, trigger }
}

/**
 * Converts a TimeRange object to an array
 */
function timeRangeToArray(timeRanges: TimeRanges): [number, number][] {
  const ranges: [number, number][] = []

  for (let i = 0; i < timeRanges.length; ++i)
    ranges.push([timeRanges.start(i), timeRanges.end(i)])

  return ranges
}

/**
 * Converts a TextTrackList object to an array of `UseMediaTextTrack`
 */
function tracksToArray(tracks: TextTrackList): UseMediaTextTrack[] {
  return Array.from(tracks)
    .map(({ label, kind, language, mode, activeCues, cues, inBandMetadataTrackDispatchType }, id) => ({ id, label, kind, language, mode, activeCues, cues, inBandMetadataTrackDispatchType }))
}

/**
 * Deep-enough equality for `UseMediaTextTrack` lists (compares the fields a media element's
 * `textTracks` list exposes). The text-track listeners refresh the `tracks` state on `addtrack` /
 * `removetrack` / `change`, and those events also fire while the injection effect (re)creates the
 * `<track>` children — without this guard every injection cycle would re-render.
 */
function tracksEqual(a: UseMediaTextTrack[], b: UseMediaTextTrack[]): boolean {
  if (a.length !== b.length)
    return false

  return a.every((track, i) => {
    const other = b[i]
    return !!other
      && track.id === other.id
      && track.label === other.label
      && track.kind === other.kind
      && track.language === other.language
      && track.mode === other.mode
  })
}

/**
 * Normalizes the `src` option into a list of `UseMediaSource` (upstream merges a string / object /
 * list the same way).
 */
function normalizeSources(src: string | UseMediaSource | UseMediaSource[] | undefined): UseMediaSource[] {
  if (!src)
    return []
  if (typeof src === 'string')
    return [{ src }]
  if (Array.isArray(src))
    return src
  if (isObject(src))
    return [src]
  return []
}

/**
 * Content fingerprint of the `src` option. React has no reactivity, so the injection effect must
 * not re-run merely because a render produced a new object identity — it depends on this stable
 * string instead.
 */
function sourcesSignature(src: string | UseMediaSource | UseMediaSource[] | undefined): string {
  return JSON.stringify(normalizeSources(src))
}

/**
 * Content fingerprint of the `tracks` option — see `sourcesSignature`.
 */
function tracksSignature(tracks: UseMediaTextTrackSource[] | undefined): string {
  return JSON.stringify(tracks ?? [])
}

const listenerOptions: AddEventListenerOptions = { passive: true }

/**
 * Mirror the value into a ref and bump the React state — used by the media event handlers so the
 * stable callbacks and the binding effect read the latest value without re-rendering (upstream
 * mutates its refs directly; React state only drives renders).
 */
function updateState(set: (value: boolean) => void, ref: { current: boolean }, value: boolean) {
  ref.current = value
  set(value)
}

/**
 * Numeric variant of `updateState` for `currentTime` / `duration` / `volume` / `playbackRate`.
 */
function updateNumberState(set: (value: number) => void, ref: { current: number }, value: number) {
  ref.current = value
  set(value)
}

/**
 * Map from @vueuse/core `useMediaControls`
 * (`source/vueuse/packages/core/useMediaControls/`).
 *
 * @example
 * const video = useRef<HTMLVideoElement>(null)
 * const { playing, currentTime, duration, volume, toggle, seek } = useMediaControls(video, {
 *   src: 'video.mp4',
 * })
 *
 * // Change initial media properties
 * useEffect(() => {
 *   setVolume(0.5)
 *   seek(60)
 * }, [])
 */
export function useMediaControls(
  target: UseMediaControlsTarget,
  options: UseMediaControlsOptions = {},
): UseMediaControlsReturn {
  const {
    document: documentOption,
  } = options

  // Latest-value refs so effects and callbacks always work with the newest
  // target / options without re-running on their identity (house pattern).
  const targetRef = useRef(target)
  targetRef.current = target
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Resolve the document during render — a guarded global read (undefined on
  // the server), mirroring upstream's `defaultDocument` default.
  const doc = documentOption ?? (typeof document === 'undefined' ? undefined : document)

  // Resolve the target element during render so the binding effects re-run
  // when it changes (a re-render that re-points the ref).
  const el = target ? unrefElement(target) : undefined

  // Resolve the src / tracks options during render so the injection effects
  // re-run when their CONTENT changes (upstream `watchEffect`s re-run on their
  // reactive values). The content is fingerprinted to a stable string: an
  // identity-based dep would loop, because the injections themselves update
  // state and re-render with a fresh option object.
  const srcSignature = sourcesSignature(options.src)
  const tracksSignatureValue = tracksSignature(options.tracks)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seeking, setSeeking] = useState(false)
  const [volume, setVolumeState] = useState(1)
  const [waiting, setWaiting] = useState(false)
  const [ended, setEnded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [rate, setRateState] = useState(1)
  const [stalled, setStalled] = useState(false)
  const [buffered, setBuffered] = useState<[number, number][]>([])
  const [tracks, setTracks] = useState<UseMediaTextTrack[]>([])
  const [selectedTrack, setSelectedTrack] = useState(-1)
  const [isPictureInPicture, setIsPictureInPicture] = useState(false)
  const [muted, setMuted] = useState(false)

  // Live mirror refs of the state above, read inside the stable callbacks and
  // the binding effect (upstream mutates and reads its refs directly; React
  // state only drives renders). Only the refs read by control methods / the
  // binding effect are kept — the rest would be write-only mirrors.
  const volumeRef = useRef(1)
  const playingRef = useRef(false)
  const rateRef = useRef(1)
  const tracksRef = useRef<UseMediaTextTrack[]>([])
  const selectedTrackRef = useRef(-1)
  const isPictureInPictureRef = useRef(false)
  const mutedRef = useRef(false)

  const supportsPictureInPicture = Boolean(doc && 'pictureInPictureEnabled' in doc)

  // The element the composable state was last applied to — see the binding
  // effect: the state is applied only when binding to a NEW element (target
  // swap), never on the first bind.
  const boundElementRef = useRef<HTMLMediaElement | null>(null)

  // Events — inlined `createEventHook` (see module-level helper).
  const sourceErrorEventRef = useRef(createEventHook<Event>())
  const playbackErrorEventRef = useRef(createEventHook<Event>())

  /**
   * Bind every media listener to the current element and apply the current state to it. Re-runs
   * (with cleanup) whenever the resolved target element changes and on unmount — upstream's
   * `useEventListener(target...)` calls plus the `watch([target, volume|muted|rate])`
   * apply-watchers and the nested text-track listeners.
   */
  useEffect(() => {
    const mediaEl = unrefElement(targetRef.current)
    if (!mediaEl)
      return

    // Apply the current state only when re-binding to a DIFFERENT element —
    // upstream's non-immediate `watch([target, volume|muted|rate])` fires on
    // target change but never at setup, so the first bind must not clobber
    // pre-set element state (e.g. a `<video muted>` attribute); re-binding
    // after a target swap restores the composable state, like upstream's
    // target-change watch firing.
    const previousElement = boundElementRef.current
    if (previousElement && mediaEl !== previousElement) {
      mediaEl.volume = volumeRef.current
      mediaEl.muted = mutedRef.current
      mediaEl.playbackRate = rateRef.current
    }
    boundElementRef.current = mediaEl

    const offs: Array<() => void> = []
    const on = (event: string, handler: () => void) => {
      mediaEl.addEventListener(event, handler, listenerOptions)
      offs.push(() => mediaEl.removeEventListener(event, handler, listenerOptions))
    }

    on('timeupdate', () => setCurrentTime(mediaEl.currentTime))
    on('durationchange', () => setDuration(mediaEl.duration))
    on('progress', () => {
      setBuffered(timeRangeToArray(mediaEl.buffered))
    })
    on('seeking', () => setSeeking(true))
    on('seeked', () => setSeeking(false))
    on('waiting', () => {
      setWaiting(true)
      updateState(setPlaying, playingRef, false)
    })
    on('loadstart', () => {
      setWaiting(true)
      updateState(setPlaying, playingRef, false)
    })
    on('loadeddata', () => setWaiting(false))
    on('playing', () => {
      setWaiting(false)
      setEnded(false)
      updateState(setPlaying, playingRef, true)
    })
    on('ratechange', () => updateNumberState(setRateState, rateRef, mediaEl.playbackRate))
    on('stalled', () => setStalled(true))
    on('ended', () => setEnded(true))
    on('pause', () => updateState(setPlaying, playingRef, false))
    on('play', () => updateState(setPlaying, playingRef, true))
    on('enterpictureinpicture', () => updateState(setIsPictureInPicture, isPictureInPictureRef, true))
    on('leavepictureinpicture', () => updateState(setIsPictureInPicture, isPictureInPictureRef, false))
    on('volumechange', () => {
      updateNumberState(setVolumeState, volumeRef, mediaEl.volume)
      updateState(setMuted, mutedRef, mediaEl.muted)
    })

    // The text-track listeners need to listen to a nested object on the
    // target, so they live inside this effect and are removed with it
    // (upstream: a nested watch with manually removed `useEventListener`s).
    const refreshTracks = () => {
      const list = tracksToArray(mediaEl.textTracks)
      if (!tracksEqual(tracksRef.current, list)) {
        tracksRef.current = list
        setTracks(list)
      }
    }
    mediaEl.textTracks.addEventListener('addtrack', refreshTracks, listenerOptions)
    mediaEl.textTracks.addEventListener('removetrack', refreshTracks, listenerOptions)
    mediaEl.textTracks.addEventListener('change', refreshTracks, listenerOptions)
    offs.push(() => {
      mediaEl.textTracks.removeEventListener('addtrack', refreshTracks, listenerOptions)
      mediaEl.textTracks.removeEventListener('removetrack', refreshTracks, listenerOptions)
      mediaEl.textTracks.removeEventListener('change', refreshTracks, listenerOptions)
    })

    return () => offs.forEach(fn => fn())
  }, [el])

  /**
   * Inject the `src` option as `<source>` children and `el.load()` — upstream `watchEffect`. The
   * created sources (and their error listeners) are removed on cleanup so a target / option change
   * never leaves stale sources behind.
   */
  useEffect(() => {
    const mediaEl = unrefElement(targetRef.current)
    const src = optionsRef.current.src
    if (!doc || !mediaEl || !src)
      return

    const sources = normalizeSources(src)

    // Clear the sources
    const existing = mediaEl.querySelectorAll('source')
    existing.forEach(e => e.remove())

    const created: HTMLSourceElement[] = []

    // Add new sources
    sources.forEach(({ src: sourceSrc, type, media }) => {
      const source = doc.createElement('source')

      source.setAttribute('src', sourceSrc)
      source.setAttribute('type', type || '')
      source.setAttribute('media', media || '')

      source.addEventListener('error', sourceErrorEventRef.current.trigger, listenerOptions)

      mediaEl.appendChild(source)
      created.push(source)
    })

    // Finally, load the new sources.
    mediaEl.load()

    return () => {
      created.forEach((source) => {
        source.removeEventListener('error', sourceErrorEventRef.current.trigger, listenerOptions)
        source.remove()
      })
    }
  }, [doc, el, srcSignature])

  /**
   * Inject the `tracks` option as `<track>` children — upstream `watchEffect`. The MediaAPI
   * provides an API for adding text tracks, but they don't currently have an API for removing text
   * tracks, so the created `<track>` elements are removed manually on cleanup (upstream re-creates
   * them on every watcher re-run).
   */
  useEffect(() => {
    const mediaEl = unrefElement(targetRef.current)
    const textTracks = optionsRef.current.tracks
    if (!doc || !mediaEl || !textTracks || !textTracks.length)
      return

    const existing = mediaEl.querySelectorAll('track')
    existing.forEach(e => e.remove())

    const created: HTMLTrackElement[] = []

    textTracks.forEach(({ default: isDefault, kind, label, src, srcLang }, i) => {
      const track = doc.createElement('track')

      track.default = isDefault || false
      track.kind = kind
      track.label = label
      track.src = src
      track.srclang = srcLang

      if (track.default && selectedTrackRef.current !== i) {
        selectedTrackRef.current = i
        setSelectedTrack(i)
      }

      mediaEl.appendChild(track)
      created.push(track)
    })

    return () => {
      created.forEach(track => track.remove())
    }
  }, [doc, el, tracksSignatureValue])

  /**
   * Disables the specified track. If no track is specified then all tracks will be disabled
   *
   * @param track The id of the track to disable
   */
  const disableTrack = useCallback((track?: number | UseMediaTextTrack) => {
    const mediaEl = unrefElement(targetRef.current)
    if (!mediaEl)
      return

    if (track) {
      const id = typeof track === 'number' ? track : track.id
      mediaEl.textTracks[id].mode = 'disabled'
    }
    else {
      for (let i = 0; i < mediaEl.textTracks.length; ++i)
        mediaEl.textTracks[i].mode = 'disabled'
    }

    if (selectedTrackRef.current !== -1) {
      selectedTrackRef.current = -1
      setSelectedTrack(-1)
    }
  }, [])

  /**
   * Enables the specified track and disables the other tracks unless otherwise specified
   *
   * @param track The track of the id of the track to enable
   * @param disableTracks Disable all other tracks
   */
  const enableTrack = useCallback((track: number | UseMediaTextTrack, disableTracks = true) => {
    const mediaEl = unrefElement(targetRef.current)
    if (!mediaEl)
      return

    const id = typeof track === 'number' ? track : track.id

    if (disableTracks)
      disableTrack()

    mediaEl.textTracks[id].mode = 'showing'
    if (selectedTrackRef.current !== id) {
      selectedTrackRef.current = id
      setSelectedTrack(id)
    }
  }, [disableTrack])

  /**
   * Toggle picture in picture mode for the player.
   */
  const togglePictureInPicture = useCallback(() => {
    return new Promise<PictureInPictureWindow | void>((resolve, reject) => {
      const mediaEl = unrefElement(targetRef.current)
      if (!mediaEl)
        return

      if (supportsPictureInPicture) {
        if (!isPictureInPictureRef.current) {
          ;(mediaEl as HTMLVideoElement).requestPictureInPicture().then(resolve).catch(reject)
        }
        else {
          doc!.exitPictureInPicture().then(resolve).catch(reject)
        }
      }
    })
  }, [doc, supportsPictureInPicture])

  /**
   * Start playback — upstream writes `playing.value = true` (ignorable watch → `el.play()`).
   * Playback failures trigger `onPlaybackError`; upstream also rethrows so Vue's global error
   * handler observes the failure, but React has no equivalent global handler for unhandled promise
   * rejections, so the error is only routed to the event hook (divergence #6 above).
   */
  const play = useCallback(() => {
    const mediaEl = unrefElement(targetRef.current)
    if (!mediaEl)
      return

    mediaEl.play().catch((e) => {
      playbackErrorEventRef.current.trigger(e)
    })
    playingRef.current = true
    setPlaying(true)
  }, [])

  /**
   * Pause playback — upstream writes `playing.value = false` (ignorable watch → `el.pause()`).
   */
  const pause = useCallback(() => {
    const mediaEl = unrefElement(targetRef.current)
    if (!mediaEl)
      return

    mediaEl.pause()
    playingRef.current = false
    setPlaying(false)
  }, [])

  /**
   * Toggle between playing and pausing the media.
   */
  const toggle = useCallback(() => {
    if (playingRef.current)
      pause()
    else
      play()
  }, [pause, play])

  /**
   * Seek the media to the given time — upstream writes `currentTime.value` (ignorable watch →
   * `el.currentTime = time`).
   *
   * @param time Time in seconds to seek to
   */
  const seek = useCallback((time: number) => {
    const mediaEl = unrefElement(targetRef.current)
    if (!mediaEl)
      return

    mediaEl.currentTime = time
    setCurrentTime(time)
  }, [])

  /**
   * Set the media volume — upstream writes `volume.value` (watch → `el.volume = volume`).
   *
   * @param volume Volume between 0 and 1
   */
  const setVolume = useCallback((nextVolume: number) => {
    const mediaEl = unrefElement(targetRef.current)
    if (!mediaEl)
      return

    mediaEl.volume = nextVolume
    volumeRef.current = nextVolume
    setVolumeState(nextVolume)
  }, [])

  /**
   * Mute the media — upstream writes `muted.value = true` (watch → `el.muted = true`).
   */
  const mute = useCallback(() => {
    const mediaEl = unrefElement(targetRef.current)
    if (!mediaEl)
      return

    mediaEl.muted = true
    mutedRef.current = true
    setMuted(true)
  }, [])

  /**
   * Unmute the media — upstream writes `muted.value = false` (watch → `el.muted = false`).
   */
  const unmute = useCallback(() => {
    const mediaEl = unrefElement(targetRef.current)
    if (!mediaEl)
      return

    mediaEl.muted = false
    mutedRef.current = false
    setMuted(false)
  }, [])

  /**
   * Toggle between muting and unmuting the media.
   */
  const toggleMute = useCallback(() => {
    if (mutedRef.current)
      unmute()
    else
      mute()
  }, [mute, unmute])

  /**
   * Set the media playback rate — upstream writes `rate.value` (watch → `el.playbackRate = rate`).
   *
   * @param rate Playback rate (e.g. 0.5, 1, 2)
   */
  const setRate = useCallback((nextRate: number) => {
    const mediaEl = unrefElement(targetRef.current)
    if (!mediaEl)
      return

    mediaEl.playbackRate = nextRate
    rateRef.current = nextRate
    setRateState(nextRate)
  }, [])

  return {
    currentTime,
    duration,
    waiting,
    seeking,
    ended,
    stalled,
    buffered,
    playing,
    rate,

    // Volume
    volume,
    muted,

    // Tracks
    tracks,
    selectedTrack,

    // Picture in Picture
    supportsPictureInPicture,
    isPictureInPicture,

    // Events
    onSourceError: sourceErrorEventRef.current.on,
    onPlaybackError: playbackErrorEventRef.current.on,

    // Controls
    play,
    pause,
    toggle,
    seek,
    setVolume,
    mute,
    unmute,
    toggleMute,
    setRate,
    enableTrack,
    disableTrack,
    togglePictureInPicture,
  }
}
