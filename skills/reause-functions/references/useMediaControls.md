---
category: Browser
---

# useMediaControls

Reactive media controls for both `audio` and `video` elements

## Usage

### Basic Usage

```tsx
import { useMediaControls } from '@reause/core'
import { useEffect, useRef } from 'react'

const video = useRef<HTMLVideoElement>(null)
const { playing, currentTime, duration, volume, setVolume, toggle, seek } = useMediaControls(video, {
  src: 'video.mp4',
})

// Change initial media properties
useEffect(() => {
  setVolume(0.5)
  seek(60)
}, [])

// <video ref={video} onClick={() => toggle()} />
// <span>{formatDuration(currentTime)} / {formatDuration(duration)}</span>
```

### Source Forms

`src` and `tracks` are read-only value sources and take plain values (upstream:
`MaybeRefOrGetter`). Resolve a React ref or state value at the call site; the element `target` is a
React ref (`RefObject`) because it is a DOM target, not a value source:

```tsx
const [src, setSrc] = useState('video.mp4')

useMediaControls(videoRef, { src, tracks: subtitleTracks })
useMediaControls(videoRef, { src: srcRef.current }) // resolve a React ref at the call site
```

### Providing Captions, Subtitles, etc...

You can provide captions, subtitles, etc in the `tracks` options of the
`useMediaControls` function. The function will return an array of tracks
along with two functions for controlling them, `enableTrack`, `disableTrack`, and `selectedTrack`.
Using these you can manage the currently selected track. `selectedTrack` will
be `-1` if there is no selected track.

```tsx
import { useMediaControls } from '@reause/core'
import { useRef } from 'react'

const video = useRef<HTMLVideoElement>(null)
const {
  tracks,
  enableTrack,
} = useMediaControls(video, {
  src: 'video.mp4',
  tracks: [
    {
      default: true,
      src: './subtitles.vtt',
      kind: 'subtitles',
      label: 'English',
      srcLang: 'en',
    },
  ],
})
```

```tsx
// <video ref={video} />
// {tracks.map(track => (
// <button type="button" key={track.id} onClick={() => enableTrack(track)}>
// {track.label}
// </button>
// ))}
```

## Playback Controls

Upstream's writable refs (`playing`, `currentTime`, `volume`, `rate`, `muted`)
are control methods here. They all resolve the
current target element at call time (upstream `usingElRef`) and are
referentially stable:

```tsx
const {
  play, // () => void        — start playback
  pause, // () => void        — pause playback
  toggle, // () => void        — play / pause toggle
  seek, // (time: number) => void — jump to `time` seconds
  setVolume, // (volume: number) => void — 0..1
  setRate, // (rate: number) => void   — e.g. 0.5 / 1 / 2
  mute, // () => void
  unmute, // () => void
  toggleMute, // () => void
} = useMediaControls(videoRef)
```

## Type Declarations

```ts
/**
 * Many of the jsdoc definitions here are modified version of the
 * documentation from MDN(https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement)
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
   * Indicates that the track should be enabled unless the user's preferences indicate
   * that another track is more appropriate
   */
  default?: boolean
  /**
   * How the text track is meant to be used. If omitted the default kind is subtitles.
   */
  kind: TextTrackKind
  /**
   * A user-readable title of the text track which is used by the browser
   * when listing available text tracks.
   */
  label: string
  /**
   * Address of the track (.vtt file). Must be a valid URL. This attribute
   * must be specified and its URL value must have the same origin as the document
   */
  src: string
  /**
   * Language of the track text data. It must be a valid BCP 47 language tag.
   * If the kind attribute is set to subtitles, then srclang must be defined.
   */
  srcLang: string
}
export interface UseMediaControlsOptions {
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in
   * testing environments. Inlined here — `ConfigurableDocument` is not ported
   * to @reause/shared.
   *
   * @default typeof document !== 'undefined' ? document : undefined
   */
  document?: Document
  /**
   * The source for the media, may either be a string, a `UseMediaSource` object, or a list
   * of `UseMediaSource` objects. A read-only value source — pass a plain value
   * (upstream: `MaybeRefOrGetter`; resolve a React ref or getter at the call
   * site).
   */
  src?: string | UseMediaSource | UseMediaSource[]
  /**
   * A list of text tracks for the media. A read-only value source — pass a
   * plain array (upstream: `MaybeRefOrGetter`; resolve a React ref or getter
   * at the call site).
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
   * Language of the track text data. It must be a valid BCP 47 language tag.
   * If the kind attribute is set to subtitles, then srclang must be defined.
   */
  language: string
  /**
   * Specifies the display mode of the text track, either `disabled`,
   * `hidden`, or `showing`
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
 * Target media element accepted by `useMediaControls` — a plain element or a
 * ref-like `{ current }` object (e.g. `useRef<HTMLVideoElement>(null)`, whose
 * `current` is populated after mount) — the React analog of upstream's
 * media-element target.
 */
export type UseMediaControlsTarget = RefObject<
  HTMLMediaElement | null | undefined
>
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
  volume: number
  muted: boolean
  tracks: UseMediaTextTrack[]
  selectedTrack: number
  supportsPictureInPicture: boolean
  isPictureInPicture: boolean
  onSourceError: EventHookOn<Event>
  onPlaybackError: EventHookOn<Event>
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  mute: () => void
  unmute: () => void
  toggleMute: () => void
  setRate: (rate: number) => void
  enableTrack: (
    track: number | UseMediaTextTrack,
    disableTracks?: boolean,
  ) => void
  disableTrack: (track?: number | UseMediaTextTrack) => void
  togglePictureInPicture: () => Promise<PictureInPictureWindow | void>
}
type EventHookOn<T = any> = (fn: (param: T) => void) => () => void
/**
 * Reactive media controls for both `audio` and `video` elements.
 *
 * Map from @vueuse/core `useMediaControls`
 * (`source/vueuse/packages/core/useMediaControls/`). Listens to the media
 * element's events (`play` / `pause` / `timeupdate` / `durationchange` /
 * `volumechange` / `ratechange` / `seeked` / `ended` / ...) and mirrors the
 * playback state into plain React state. The `src` and `tracks` options are
 * injected into the element as `<source>` / `<track>` children (upstream
 * `watchEffect`s), and the returned controls drive the element directly.
 *
 * React divergences from upstream:
 *
 * 1. The Vue `ShallowRef` returns become plain state values
 *    (`currentTime`, `duration`, `playing`, `volume`, `muted`, `rate`,
 *    `tracks`, `selectedTrack`, ...) returned in a single object — read them
 *    like upstream's `xxx.value`.
 * 2. Writable refs → control methods: upstream writes
 *    `playing.value = true`, `currentTime.value = 60`, `volume.value = 0.5`,
 *    `rate.value = 2`, `muted.value = true`; here those writes become
 *    `play()` / `pause()` / `toggle()`, `seek(time)`, `setVolume(volume)`,
 *    `setRate(rate)`, `mute()` / `unmute()` / `toggleMute()`. Each method
 *    writes through to the element (mirroring upstream's ignorable watches).
 *    `enableTrack` / `disableTrack` / `togglePictureInPicture` are ported
 *    as-is (they were methods upstream too).
 * 3. Upstream's per-event `useEventListener(target, ...)` bindings and the
 *    nested text-track listeners become a single binding effect that resolves
 *    the current element via `toValue` at effect run time — so a `useRef`
 *    target populated after mount still binds, exactly like upstream's
 *    element-aware watches — and re-binds with cleanup whenever the resolved
 *    element changes or the hook unmounts.
 * 4. The upstream `watchEffect`s that inject `<source>` / `<track>` children
 *    and call `el.load()` become effects that clean up the injected elements
 *    (removing them from the previous element when the target or options
 *    change) and that are SSR-safe — `document` is only reached through a
 *    guarded default and the effects run after mount. `options.src` and
 *    `options.tracks` are read-only value sources and take plain values
 *    (upstream: `MaybeRefOrGetter`; resolve a React ref or getter at the call
 *    site). The `target` element param stays
 *    `MaybeRefOrGetter<HTMLMediaElement | null | undefined>` (a DOM target, not a
 *    value source).
 * 5. `supportsPictureInPicture` is resolved once at setup (upstream reads a
 *    computed at setup too) and state defaults (`volume: 1`, `muted: false`,
 *    `rate: 1`, `currentTime: 0`, ...) stay until the events fill them in.
 * 6. The `onSourceError` / `onPlaybackError` event hooks (upstream
 *    `createEventHook`) are inlined — the shared `createEventHook` is not yet
 *    ported to @reause/shared. Upstream's `play()` failure path also rethrows
 *    so Vue's global error handler observes it; React has no equivalent global
 *    handler for unhandled promise rejections, so here the failure is only
 *    routed to `onPlaybackError`.
 * 7. SSR-safe: nothing touches `document` or the media element during render
 *    — the element is only accessed inside effects and control methods, so
 *    the server renders the initial defaults.
 * 8. Upstream's non-immediate `watch([target, volume|muted|rate])`
 *    apply-watchers are replaced by the control methods writing through to
 *    the element directly; the binding effect only applies the current
 *    `volume` / `muted` / `playbackRate` when re-binding to a *different*
 *    element (target swap), so the first bind never clobbers pre-set element
 *    state (e.g. a `<video muted>` attribute).
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
export declare function useMediaControls(
  target: UseMediaControlsTarget,
  options?: UseMediaControlsOptions,
): UseMediaControlsReturn
```
