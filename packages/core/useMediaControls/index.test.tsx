import type { UseMediaControlsReturn, UseMediaSource, UseMediaTextTrackSource } from '../useMediaControls'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useMediaControls } from '../useMediaControls'

// The upstream package ships no tests for `useMediaControls` (only
// `index.ts` + `demo.vue` + `index.md`), so these are self-written cases
// covering the object-mirror contract: initial state, the media events
// (`timeupdate`, `durationchange`, `volumechange`, `ratechange`, `play` /
// `pause`, `seeking` / `seeked`, `waiting` / `loadeddata`, `ended`,
// `stalled`, `progress`), the control methods (`play` / `pause` / `toggle`,
// `seek`, `setVolume`, `mute` / `unmute` / `toggleMute`, `setRate`,
// `enableTrack` / `disableTrack`, `togglePictureInPicture` enter/exit),
// event-hook subscribe/unsubscribe, the `src` (string / object / array) and
// `tracks` option injection including re-injection on option change, the
// bind effect's first-bind vs target-swap behavior, listener cleanup on
// unmount and target change, and SSR safety. Media state that depends on a
// loaded resource (`currentTime`, `duration`, `buffered`) is stubbed on the
// element so the assertions are deterministic in the headless browser.

function stubNumberProperty(el: HTMLVideoElement, prop: 'currentTime' | 'duration') {
  let value = 0
  // An own property shadows the native accessor, so assignments to
  // `el.currentTime` (from `seek` etc. or the test) only update the box
  // below — no native seek / duration side effects. The returned setter is
  // for read-only props (`duration`): TypeScript forbids assigning to them
  // even though the own property makes the write legal at runtime.
  Object.defineProperty(el, prop, {
    configurable: true,
    get: () => value,
    set: (next: number) => {
      value = next
    },
  })
  return (next: number) => {
    value = next
  }
}

describe('useMediaControls', () => {
  let video: HTMLVideoElement

  beforeEach(() => {
    video = document.createElement('video')
    document.body.appendChild(video)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    video.remove()
  })

  it('initializes with the upstream default state and exposes all controls', async () => {
    const { result } = await renderHook(() => useMediaControls({ current: video }))

    expect(result.current.currentTime).toBe(0)
    expect(result.current.duration).toBe(0)
    expect(result.current.waiting).toBe(false)
    expect(result.current.seeking).toBe(false)
    expect(result.current.ended).toBe(false)
    expect(result.current.stalled).toBe(false)
    expect(result.current.buffered).toEqual([])
    expect(result.current.playing).toBe(false)
    expect(result.current.rate).toBe(1)
    expect(result.current.volume).toBe(1)
    expect(result.current.muted).toBe(false)
    expect(result.current.tracks).toEqual([])
    expect(result.current.selectedTrack).toBe(-1)
    expect(result.current.isPictureInPicture).toBe(false)
    expect(result.current.supportsPictureInPicture).toBeTypeOf('boolean')

    expect(result.current.play).toBeTypeOf('function')
    expect(result.current.pause).toBeTypeOf('function')
    expect(result.current.toggle).toBeTypeOf('function')
    expect(result.current.seek).toBeTypeOf('function')
    expect(result.current.setVolume).toBeTypeOf('function')
    expect(result.current.mute).toBeTypeOf('function')
    expect(result.current.unmute).toBeTypeOf('function')
    expect(result.current.toggleMute).toBeTypeOf('function')
    expect(result.current.setRate).toBeTypeOf('function')
    expect(result.current.enableTrack).toBeTypeOf('function')
    expect(result.current.disableTrack).toBeTypeOf('function')
    expect(result.current.togglePictureInPicture).toBeTypeOf('function')
    expect(result.current.onSourceError).toBeTypeOf('function')
    expect(result.current.onPlaybackError).toBeTypeOf('function')
  })

  it('mirrors timeupdate and durationchange events into state', async () => {
    stubNumberProperty(video, 'currentTime')
    const setDuration = stubNumberProperty(video, 'duration')

    const { result, act } = await renderHook(() => useMediaControls({ current: video }))

    video.currentTime = 42
    await act(async () => {
      video.dispatchEvent(new Event('timeupdate'))
    })
    expect(result.current.currentTime).toBe(42)

    setDuration(100)
    await act(async () => {
      video.dispatchEvent(new Event('durationchange'))
    })
    expect(result.current.duration).toBe(100)
  })

  it('mirrors play / pause / playing / ended events into state', async () => {
    const { result, act } = await renderHook(() => useMediaControls({ current: video }))

    await act(async () => {
      video.dispatchEvent(new Event('play'))
    })
    expect(result.current.playing).toBe(true)

    await act(async () => {
      video.dispatchEvent(new Event('pause'))
    })
    expect(result.current.playing).toBe(false)

    await act(async () => {
      video.dispatchEvent(new Event('playing'))
    })
    expect(result.current.playing).toBe(true)
    expect(result.current.waiting).toBe(false)

    await act(async () => {
      video.dispatchEvent(new Event('ended'))
    })
    expect(result.current.ended).toBe(true)
    expect(result.current.playing).toBe(true)
  })

  it('tracks waiting / loadstart / loadeddata state', async () => {
    const { result, act } = await renderHook(() => useMediaControls({ current: video }))

    await act(async () => {
      video.dispatchEvent(new Event('waiting'))
    })
    expect(result.current.waiting).toBe(true)
    expect(result.current.playing).toBe(false)

    await act(async () => {
      video.dispatchEvent(new Event('loadstart'))
    })
    expect(result.current.waiting).toBe(true)

    await act(async () => {
      video.dispatchEvent(new Event('loadeddata'))
    })
    expect(result.current.waiting).toBe(false)

    // playing clears the end state (upstream 'playing' handler)
    await act(async () => {
      video.dispatchEvent(new Event('ended'))
    })
    expect(result.current.ended).toBe(true)
    await act(async () => {
      video.dispatchEvent(new Event('playing'))
    })
    expect(result.current.ended).toBe(false)
  })

  it('mirrors seeking / seeked / stalled events into state', async () => {
    const { result, act } = await renderHook(() => useMediaControls({ current: video }))

    await act(async () => {
      video.dispatchEvent(new Event('seeking'))
    })
    expect(result.current.seeking).toBe(true)

    await act(async () => {
      video.dispatchEvent(new Event('seeked'))
    })
    expect(result.current.seeking).toBe(false)

    await act(async () => {
      video.dispatchEvent(new Event('stalled'))
    })
    expect(result.current.stalled).toBe(true)
  })

  it('mirrors volumechange and ratechange events into state', async () => {
    const { result, act } = await renderHook(() => useMediaControls({ current: video }))

    await act(async () => {
      video.volume = 0.5
      video.muted = true
      video.dispatchEvent(new Event('volumechange'))
    })
    expect(result.current.volume).toBe(0.5)
    expect(result.current.muted).toBe(true)

    await act(async () => {
      video.playbackRate = 2
      video.dispatchEvent(new Event('ratechange'))
    })
    expect(result.current.rate).toBe(2)
  })

  it('mirrors the buffered ranges from the progress event', async () => {
    Object.defineProperty(video, 'buffered', {
      configurable: true,
      get: () => ({ length: 1, start: () => 0, end: () => 10 }) as unknown as TimeRanges,
    })

    const { result, act } = await renderHook(() => useMediaControls({ current: video }))

    await act(async () => {
      video.dispatchEvent(new Event('progress'))
    })
    expect(result.current.buffered).toEqual([[0, 10]])
  })

  it('play / pause / toggle drive the element and the playing state', async () => {
    const playSpy = vi.spyOn(video, 'play').mockResolvedValue(undefined)
    const pauseSpy = vi.spyOn(video, 'pause').mockImplementation(() => {})

    const { result, act } = await renderHook(() => useMediaControls({ current: video }))

    await act(async () => {
      result.current.play()
    })
    expect(playSpy).toHaveBeenCalledTimes(1)
    expect(result.current.playing).toBe(true)

    await act(async () => {
      result.current.toggle()
    })
    expect(pauseSpy).toHaveBeenCalledTimes(1)
    expect(result.current.playing).toBe(false)

    await act(async () => {
      result.current.toggle()
    })
    expect(playSpy).toHaveBeenCalledTimes(2)
    expect(result.current.playing).toBe(true)

    await act(async () => {
      result.current.pause()
    })
    expect(pauseSpy).toHaveBeenCalledTimes(2)
    expect(result.current.playing).toBe(false)
  })

  it('seek / setVolume / mute / unmute / toggleMute / setRate write through to the element', async () => {
    stubNumberProperty(video, 'currentTime')

    const { result, act } = await renderHook(() => useMediaControls({ current: video }))

    await act(async () => {
      result.current.seek(60)
    })
    expect(video.currentTime).toBe(60)
    expect(result.current.currentTime).toBe(60)

    await act(async () => {
      result.current.setVolume(0.25)
    })
    expect(video.volume).toBe(0.25)
    expect(result.current.volume).toBe(0.25)

    await act(async () => {
      result.current.mute()
    })
    expect(video.muted).toBe(true)
    expect(result.current.muted).toBe(true)

    await act(async () => {
      result.current.toggleMute()
    })
    expect(video.muted).toBe(false)
    expect(result.current.muted).toBe(false)

    await act(async () => {
      result.current.unmute()
    })
    expect(video.muted).toBe(false)

    await act(async () => {
      result.current.setRate(2)
    })
    expect(video.playbackRate).toBe(2)
    expect(result.current.rate).toBe(2)
  })

  it('binds to a ref target populated after mount (listeners attach in the effect)', async () => {
    const targetRef: { current: HTMLVideoElement | null } = { current: null }
    const videoEl = document.createElement('video')
    document.body.appendChild(videoEl)
    stubNumberProperty(videoEl, 'currentTime')

    const { result, act, rerender } = await renderHook(() => useMediaControls(targetRef))
    expect(result.current.currentTime).toBe(0)

    // simulate React populating the ref after mount (e.g. `ref={targetRef}`)
    targetRef.current = videoEl
    await rerender()

    videoEl.currentTime = 42
    await act(async () => {
      videoEl.dispatchEvent(new Event('timeupdate'))
    })
    expect(result.current.currentTime).toBe(42)

    videoEl.remove()
  })

  it('removes the media listeners on unmount', async () => {
    const removeSpy = vi.spyOn(video, 'removeEventListener')

    const { result, act, unmount } = await renderHook(() => useMediaControls({ current: video }))

    await act(async () => {
      video.dispatchEvent(new Event('timeupdate'))
    })
    expect(result.current.playing).toBe(false)

    await unmount()
    expect(removeSpy).toHaveBeenCalledWith('timeupdate', expect.any(Function), { passive: true })
  })

  it('re-binds the listeners when the resolved target element changes', async () => {
    const video2 = document.createElement('video')
    document.body.appendChild(video2)
    stubNumberProperty(video, 'currentTime')
    stubNumberProperty(video2, 'currentTime')

    // a ref-like `{ current }` holder: swapping `current` and re-rendering is
    // how a changed target is signalled now that getters are gone
    const target = { current: video as HTMLVideoElement | null }
    const { result, act, rerender } = await renderHook(() => useMediaControls(target))

    video.currentTime = 10
    await act(async () => {
      video.dispatchEvent(new Event('timeupdate'))
    })
    expect(result.current.currentTime).toBe(10)

    target.current = video2
    await rerender()

    video2.currentTime = 20
    await act(async () => {
      video2.dispatchEvent(new Event('timeupdate'))
    })
    expect(result.current.currentTime).toBe(20)

    // the old element's listeners were removed
    video.currentTime = 30
    await act(async () => {
      video.dispatchEvent(new Event('timeupdate'))
    })
    expect(result.current.currentTime).toBe(20)

    video2.remove()
  })

  it('does not clobber pre-set element state on the first bind', async () => {
    // e.g. a `<video muted>` element — upstream's non-immediate
    // `watch([target, volume|muted|rate])` never writes at setup, so the
    // first bind must preserve the element's own state
    video.muted = true
    video.volume = 0.3
    video.playbackRate = 0.5

    await renderHook(() => useMediaControls({ current: video }))

    expect(video.muted).toBe(true)
    expect(video.volume).toBe(0.3)
    expect(video.playbackRate).toBe(0.5)
  })

  it('applies the composable state when re-binding to a new element', async () => {
    const video2 = document.createElement('video')
    document.body.appendChild(video2)

    const target = { current: video as HTMLVideoElement | null }
    const { result, act, rerender } = await renderHook(() => useMediaControls(target))

    await act(async () => {
      result.current.mute()
    })
    expect(video.muted).toBe(true)
    expect(result.current.muted).toBe(true)

    // swapping the target restores the current state on the new element
    // (upstream: the target-change watch fires)
    target.current = video2
    await rerender()

    expect(video2.muted).toBe(true)
    expect(result.current.muted).toBe(true)

    video2.remove()
  })

  it('injects source elements from the src option, loads them and reports source errors', async () => {
    const loadSpy = vi.spyOn(video, 'load').mockImplementation(() => {})

    const { result, act } = await renderHook(() => useMediaControls({ current: video }, {
      src: { src: 'https://example.com/media.mp4', type: 'video/mp4' },
    }))

    const source = video.querySelector('source')
    expect(source?.getAttribute('src')).toBe('https://example.com/media.mp4')
    expect(source?.getAttribute('type')).toBe('video/mp4')
    expect(loadSpy).toHaveBeenCalledTimes(1)

    const errorHandler = vi.fn()
    result.current.onSourceError(errorHandler)

    const errorEvent = new Event('error')
    await act(async () => {
      source!.dispatchEvent(errorEvent)
    })
    expect(errorHandler).toHaveBeenCalledTimes(1)
    expect(errorHandler.mock.calls[0]![0]).toBe(errorEvent)
  })

  it('accepts a string src and an array of sources', async () => {
    const loadSpy = vi.spyOn(video, 'load').mockImplementation(() => {})

    const { rerender } = await renderHook<{ src?: string | UseMediaSource | UseMediaSource[] }, UseMediaControlsReturn>(
      (props?) => useMediaControls({ current: video }, { src: props?.src ?? 'https://example.com/media.mp4' }),
      { initialProps: { src: 'https://example.com/media.mp4' } },
    )

    const stringSource = video.querySelector('source')
    expect(stringSource?.getAttribute('src')).toBe('https://example.com/media.mp4')
    expect(loadSpy).toHaveBeenCalledTimes(1)

    await rerender({
      src: [
        { src: 'https://example.com/video.mp4', type: 'video/mp4' },
        { src: 'https://example.com/video.webm', type: 'video/webm' },
      ],
    })

    const sources = video.querySelectorAll('source')
    expect(sources.length).toBe(2)
    expect(sources[0]?.getAttribute('src')).toBe('https://example.com/video.mp4')
    expect(sources[0]?.getAttribute('type')).toBe('video/mp4')
    expect(sources[1]?.getAttribute('src')).toBe('https://example.com/video.webm')
    expect(sources[1]?.getAttribute('type')).toBe('video/webm')
  })

  it('unsubscribes an event-hook listener via the returned off function', async () => {
    vi.spyOn(video, 'load').mockImplementation(() => {})

    const { result, act } = await renderHook(() => useMediaControls({ current: video }, {
      src: { src: 'https://example.com/media.mp4' },
    }))

    const source = video.querySelector('source')!
    const handler = vi.fn()
    const off = result.current.onSourceError(handler)

    await act(async () => {
      source.dispatchEvent(new Event('error'))
    })
    expect(handler).toHaveBeenCalledTimes(1)

    off()
    await act(async () => {
      source.dispatchEvent(new Event('error'))
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('injects track elements from the tracks option and manages them', async () => {
    const { result, act } = await renderHook(() => useMediaControls({ current: video }, {
      tracks: [
        { default: true, src: 'https://example.com/subtitles-en.vtt', kind: 'subtitles', label: 'English', srcLang: 'en' },
        { src: 'https://example.com/subtitles-es.vtt', kind: 'subtitles', label: 'Spanish', srcLang: 'es' },
      ],
    }))

    expect(video.querySelectorAll('track').length).toBe(2)
    // the default track becomes the selected track (upstream selectedTrack)
    expect(result.current.selectedTrack).toBe(0)

    // Headless chromium does not fire 'addtrack' / 'change' on `textTracks`
    // for programmatically injected <track> elements, so the events are
    // dispatched manually to drive the state refresh.
    await act(async () => {
      video.textTracks.dispatchEvent(new Event('addtrack'))
    })
    expect(result.current.tracks.length).toBe(2)
    expect(result.current.tracks[0]?.label).toBe('English')
    expect(result.current.tracks[0]?.kind).toBe('subtitles')
    expect(result.current.tracks[0]?.language).toBe('en')

    await act(async () => {
      result.current.enableTrack(1)
    })
    expect(result.current.selectedTrack).toBe(1)
    // enableTrack disables the other tracks and shows the requested one
    expect(video.textTracks[1]?.mode).toBe('showing')
    expect(video.textTracks[0]?.mode).toBe('disabled')

    await act(async () => {
      video.textTracks.dispatchEvent(new Event('change'))
    })
    expect(result.current.tracks[1]?.mode).toBe('showing')
    expect(result.current.tracks[0]?.mode).toBe('disabled')

    await act(async () => {
      result.current.disableTrack()
    })
    expect(result.current.selectedTrack).toBe(-1)
    await act(async () => {
      video.textTracks.dispatchEvent(new Event('change'))
    })
    expect(result.current.tracks.every(t => t.mode === 'disabled')).toBe(true)
  })

  it('re-injects tracks when the tracks option changes', async () => {
    const { rerender } = await renderHook(
      (props?: { tracks?: UseMediaTextTrackSource[] }) =>
        useMediaControls({ current: video }, { tracks: props?.tracks }),
      {
        initialProps: {
          tracks: [
            { src: 'https://example.com/subtitles-en.vtt', kind: 'subtitles', label: 'English', srcLang: 'en' },
          ],
        },
      },
    )

    expect(video.querySelectorAll('track').length).toBe(1)

    await rerender({
      tracks: [
        { default: true, src: 'https://example.com/subtitles-fr.vtt', kind: 'subtitles', label: 'French', srcLang: 'fr' },
        { src: 'https://example.com/subtitles-de.vtt', kind: 'subtitles', label: 'German', srcLang: 'de' },
      ],
    })

    const tracks = video.querySelectorAll('track')
    expect(tracks.length).toBe(2)
    expect(tracks[0]?.getAttribute('srclang')).toBe('fr')
    expect(tracks[0]?.getAttribute('label')).toBe('French')
    expect(tracks[1]?.getAttribute('srclang')).toBe('de')
  })

  it('toggles picture-in-picture via request / exit', async () => {
    const requestPip = vi.fn().mockResolvedValue(undefined)
    // WebKit ships no `HTMLVideoElement.requestPictureInPicture` (verified:
    // `'requestPictureInPicture' in HTMLVideoElement.prototype` is false), so
    // install the standard method before asserting it is called — the fake
    // document below reports the PiP API as available, which is what the hook
    // reads to decide whether to use it.
    Object.defineProperty(video, 'requestPictureInPicture', { configurable: true, writable: true, value: requestPip })
    const exitPip = vi.fn().mockResolvedValue(undefined)
    const fakeDoc = {
      pictureInPictureEnabled: true,
      exitPictureInPicture: exitPip,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as Document

    const { result, act, unmount } = await renderHook(() => useMediaControls({ current: video }, { document: fakeDoc }))
    expect(result.current.supportsPictureInPicture).toBe(true)
    expect(result.current.isPictureInPicture).toBe(false)

    await act(async () => {
      await result.current.togglePictureInPicture()
    })
    expect(requestPip).toHaveBeenCalledTimes(1)
    expect(exitPip).not.toHaveBeenCalled()

    // the element reports the entered state once the request settles
    await act(async () => {
      video.dispatchEvent(new Event('enterpictureinpicture'))
    })
    expect(result.current.isPictureInPicture).toBe(true)

    await act(async () => {
      await result.current.togglePictureInPicture()
    })
    expect(exitPip).toHaveBeenCalledTimes(1)

    await act(async () => {
      video.dispatchEvent(new Event('leavepictureinpicture'))
    })
    expect(result.current.isPictureInPicture).toBe(false)

    await unmount()
  })

  it('triggers onPlaybackError when el.play() rejects', async () => {
    const playSpy = vi.spyOn(video, 'play').mockRejectedValue(new Error('playback failed'))

    const { result, act } = await renderHook(() => useMediaControls({ current: video }))

    const errorHandler = vi.fn()
    result.current.onPlaybackError(errorHandler)

    await act(async () => {
      result.current.play()
    })

    await vi.waitFor(() => {
      expect(errorHandler).toHaveBeenCalledTimes(1)
    })
    expect(errorHandler.mock.calls[0]![0]).toBeInstanceOf(Error)
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it('reports supportsPictureInPicture false and inits false when the document has no Picture-in-Picture API', async () => {
    const fakeDoc = {
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as Document

    const { result } = await renderHook(() => useMediaControls({ current: video }, { document: fakeDoc }))

    expect(result.current.supportsPictureInPicture).toBe(false)
    expect(result.current.isPictureInPicture).toBe(false)
  })

  it('no-ops the controls and keeps the defaults without a resolved element (target: null)', async () => {
    const { result, act } = await renderHook(() => useMediaControls({ current: null }))

    expect(result.current.playing).toBe(false)
    expect(result.current.currentTime).toBe(0)

    await act(async () => {
      result.current.play()
      result.current.seek(10)
      result.current.setVolume(0.5)
    })
    expect(result.current.playing).toBe(false)
    expect(result.current.currentTime).toBe(0)
    expect(result.current.volume).toBe(1)
  })

  it('keeps the SSR-safe defaults during render before the mount effect', async () => {
    const snapshots: Array<{ currentTime: number, playing: boolean, volume: number }> = []

    function Probe() {
      const controls = useMediaControls({ current: null })
      snapshots.push({ currentTime: controls.currentTime, playing: controls.playing, volume: controls.volume })
      return <div>{controls.playing ? 'playing' : 'paused'}</div>
    }

    await render(<Probe />)

    expect(snapshots[0]).toEqual({ currentTime: 0, playing: false, volume: 1 })
  })
})
