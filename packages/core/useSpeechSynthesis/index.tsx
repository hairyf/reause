import type { ConfigurableWindow } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export type UseSpeechSynthesisStatus = 'init' | 'play' | 'pause' | 'end'

export interface UseSpeechSynthesisOptions extends ConfigurableWindow {
  /**
   * Language for SpeechSynthesis
   *
   * @default 'en-US'
   */
  lang?: string
  /**
   * Gets and sets the pitch at which the utterance will be spoken at.
   *
   * @default 1
   */
  pitch?: number
  /**
   * Gets and sets the speed at which the utterance will be spoken at.
   *
   * @default 1
   */
  rate?: number
  /**
   * Gets and sets the voice that will be used to speak the utterance.
   */
  voice?: SpeechSynthesisVoice
  /**
   * Gets and sets the volume that the utterance will be spoken at.
   *
   * @default 1
   */
  volume?: number
  /**
   * Callback function that is called when the boundary event is triggered.
   */
  onBoundary?: (event: SpeechSynthesisEvent) => void
}

export interface UseSpeechSynthesisReturn {
  isSupported: boolean
  isPlaying: boolean
  status: UseSpeechSynthesisStatus
  utterance: SpeechSynthesisUtterance | undefined
  error: SpeechSynthesisErrorEvent | undefined
  stop: () => void
  toggle: (value?: boolean) => void
  speak: () => void
}

/**
 * Map from @vueuse/core `useSpeechSynthesis`
 * (`source/vueuse/packages/core/useSpeechSynthesis/`). Reactive
 * [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).
 *
 * React divergences:
 * - the `isSupported` / `isPlaying` / `status` / `error` / `utterance` shallow
 *   refs become plain state values; `isSupported` resolves in a mount effect
 *   (same pattern as `useMounted`) so SSR and hydration render `false` first;
 * - is a computed that recreates a `SpeechSynthesisUtterance` on every read — here each `speak()`
 * call owns that lifecycle: it creates the fresh utterance, binds its events in speak's own scope
 * and stores it in the `utterance` state, which stays `undefined` until the first `speak()`;
 * - `speak` / `stop` / `toggle` are stable callbacks reading the latest
 *   `text` and options through refs;
 * - the `isPlaying` watcher (`synth.resume()` / `synth.pause()`) and the
 *   `lang` / `voice` watchers become `useEffect`s;
 * - `speak` / `stop` are no-ops instead of throwing when the Web Speech API
 *   is unavailable; unmount is a no-op — upstream only clears `isPlaying` on
 *   scope dispose and does not cancel ongoing speech either.
 *
 * Note: upstream docs list a `voiceInfo` return member, but the upstream implementation (vendored
 * source and `vueuse/main` alike) never provides it — this port mirrors the implementation.
 *
 * @example
 * const { isSupported, isPlaying, status, speak } = useSpeechSynthesis('Hello world')
 */
export function useSpeechSynthesis(
  text?: string,
  options: UseSpeechSynthesisOptions = {},
): UseSpeechSynthesisReturn {
  const { window: windowOption } = options

  const resolveSynth = useCallback((): SpeechSynthesis | undefined => {
    const win = windowOption ?? (typeof window === 'undefined' ? undefined : window)
    return win
      ? (win as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis
      : undefined
  }, [windowOption])

  const [isSupported, setIsSupported] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [status, setStatus] = useState<UseSpeechSynthesisStatus>('init')
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | undefined>(undefined)
  const [error, setError] = useState<SpeechSynthesisErrorEvent | undefined>(undefined)

  // Latest-value refs keep `speak` / `stop` / `toggle` referentially stable.
  const latestRef = useRef({ text, options, resolveSynth })
  latestRef.current = { text, options, resolveSynth }

  const isPlayingRef = useRef(false)
  isPlayingRef.current = isPlaying

  const lastUtteranceRef = useRef<SpeechSynthesisUtterance | undefined>(undefined)

  // Resolved after mount so SSR renders `false` (same pattern as `useMounted`).
  useEffect(() => {
    setIsSupported(Boolean(latestRef.current.resolveSynth()))
  }, [resolveSynth])

  // Mirror upstream's `watch(isPlaying)` → `synth.resume()` / `synth.pause()`;
  // the previous-value check keeps the mount run a no-op like a Vue watcher.
  const prevPlayingRef = useRef(false)
  useEffect(() => {
    if (prevPlayingRef.current === isPlaying)
      return
    prevPlayingRef.current = isPlaying
    const synth = latestRef.current.resolveSynth()
    if (!synth)
      return
    if (isPlaying)
      synth.resume()
    else
      synth.pause()
  }, [isPlaying])

  // Mirror upstream's `watch(lang)` — keeps the pending utterance in sync
  // while it is not playing.
  useEffect(() => {
    if (lastUtteranceRef.current && !isPlayingRef.current)
      lastUtteranceRef.current.lang = options.lang || 'en-US'
  }, [options.lang])

  // Mirror upstream's `watch(options.voice)` — upstream installs the watcher
  // only `if (options.voice)` at setup, so a transition from `undefined` to a
  // voice never auto-cancels. The same gate is expressed here by cancelling
  // only when a voice was already in effect (the previous value was defined).
  const prevVoiceRef = useRef<SpeechSynthesisVoice | undefined>(options.voice)
  useEffect(() => {
    if (prevVoiceRef.current === options.voice)
      return
    const previousVoice = prevVoiceRef.current
    prevVoiceRef.current = options.voice
    if (previousVoice)
      latestRef.current.resolveSynth()?.cancel()
  }, [options.voice])

  const speak = useCallback(() => {
    const synth = latestRef.current.resolveSynth()
    if (!synth)
      return

    const { text: spokenText, options: currentOptions } = latestRef.current

    synth.cancel()

    // Upstream resets the state and creates a new utterance on every
    // utterance-computed read — `speak` owns that lifecycle here.
    setIsPlaying(false)
    setStatus('init')

    const next = new SpeechSynthesisUtterance(spokenText || '')
    next.lang = currentOptions.lang || 'en-US'
    next.voice = currentOptions.voice || null
    next.pitch = currentOptions.pitch ?? 1
    next.rate = currentOptions.rate ?? 1
    next.volume = currentOptions.volume ?? 1

    next.onstart = () => {
      setIsPlaying(true)
      setStatus('play')
    }
    next.onpause = () => {
      setIsPlaying(false)
      setStatus('pause')
    }
    next.onresume = () => {
      setIsPlaying(true)
      setStatus('play')
    }
    next.onend = () => {
      setIsPlaying(false)
      setStatus('end')
    }
    next.onerror = (event) => {
      setError(event)
    }
    next.onboundary = (event) => {
      latestRef.current.options.onBoundary?.(event)
    }

    lastUtteranceRef.current = next
    setUtterance(next)

    synth.speak(next)
  }, [])

  const stop = useCallback(() => {
    const synth = latestRef.current.resolveSynth()
    if (!synth)
      return
    synth.cancel()
    setIsPlaying(false)
  }, [])

  const toggle = useCallback((value?: boolean) => {
    setIsPlaying(value ?? (prev => !prev))
  }, [])

  return {
    isSupported,
    isPlaying,
    status,
    utterance,
    error,

    stop,
    toggle,
    speak,
  }
}
