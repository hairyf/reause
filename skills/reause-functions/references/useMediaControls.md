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
export declare function useMediaControls(
  target: UseMediaControlsTarget,
  options?: UseMediaControlsOptions,
): UseMediaControlsReturn
```
