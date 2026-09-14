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
