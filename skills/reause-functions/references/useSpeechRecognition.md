---
category: Sensors
---

# useSpeechRecognition

Reactive [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)

## Usage

```tsx
import { useSpeechRecognition } from '@reause/core'

const {
  isSupported,
  isListening,
  isFinal,
  result,
  confidence,
  start,
  stop,
} = useSpeechRecognition()

start()
// ...
stop()
```

The `confidence` value tracks the [confidence value](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionAlternative/confidence) of the latest result, between 0 and 1.

### Options

The following shows the default values of the options, they will be directly passed to [SpeechRecognition API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

```tsx
useSpeechRecognition({
  lang: 'en-US',
  interimResults: true,
  continuous: true,
})
```

## Type Declarations

```ts
/**
 * Structural subset of the Web Speech API `SpeechRecognition` interface —
 * `lib.dom` does not ship the global type yet (it only defines
 * `SpeechRecognitionResult(List)` and `SpeechRecognitionAlternative`), so
 * this mirrors upstream's local `types.ts` instead of adding ambient
 * declarations.
 */
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  grammars: unknown
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onaudioend: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onaudiostart: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown)
    | null
  onnomatch:
    ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null
  onresult:
    ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null
  onsoundend: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onsoundstart: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onspeechstart: ((this: SpeechRecognition, ev: Event) => unknown) | null
  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null
  start: () => void
  stop: () => void
  abort: () => void
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}
export interface UseSpeechRecognitionOptions extends ConfigurableWindow {
  /**
   * Controls whether continuous results are returned for each recognition, or only a single result.
   *
   * @default true
   */
  continuous?: boolean
  /**
   * Controls whether interim results should be returned (true) or not (false.) Interim results are results that are not yet final
   *
   * @default true
   */
  interimResults?: boolean
  /**
   * Language for SpeechRecognition
   *
   * @default 'en-US'
   */
  lang?: string
  /**
   * A number representing the maximum returned alternatives for each result.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/maxAlternatives
   * @default 1
   */
  maxAlternatives?: number
}
export interface UseSpeechRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  /**
   * Setter for `isListening` — the React mapping of upstream's writable
   * `isListening` ref. Takes a plain value or a functional updater (like a
   * React `useState` setter, `prev => next`). `setIsListening(true)` starts
   * the recognition instance, `false` stops it — the same effect as
   * `start()` / `stop()`.
   */
  setIsListening: Dispatch<SetStateAction<boolean>>
  isFinal: boolean
  /**
   * The underlying SpeechRecognition instance — created once during the
   * first render when the API is available, `undefined` otherwise.
   */
  recognition: SpeechRecognition | undefined
  result: string
  /**
   * Confidence value of the latest result, between 0 and 1.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognitionAlternative/confidence
   */
  confidence: number
  error: SpeechRecognitionErrorEvent | Error | undefined
  /**
   * Setter for `error` — the React mapping of upstream's writable `error`
   * ref. Takes a plain value or a functional updater (like a React
   * `useState` setter, `prev => next`).
   */
  setError: Dispatch<
    SetStateAction<SpeechRecognitionErrorEvent | Error | undefined>
  >
  toggle: (value?: boolean) => void
  start: () => void
  stop: () => void
}
/**
 * React port of VueUse's `useSpeechRecognition`.
 *
 * Map from @vueuse/core `useSpeechRecognition`
 * (`source/vueuse/packages/core/useSpeechRecognition/`). Reactive
 * [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
 * — drives the browser speech service and tracks the recognized transcript.
 *
 * React divergences:
 *
 * 1. The Vue refs (`isListening`, `isFinal`, `result`, `confidence`,
 *    `error`) become plain state values; upstream's writable refs are paired
 *    with their setters (`isListening` → `setIsListening`, `error` →
 *    `setError`) while the read-only ones (`isFinal`, `result`,
 *    `confidence`) stay read-only; `recognition` is the stable underlying
 *    instance, created during the first render when the API is available
 *    (upstream creates it eagerly in setup).
 * 2. `start()` / `stop()` / `toggle()` are stable callbacks backed by
 *    latest-value refs. Upstream drives `recognition.start()` /
 *    `recognition.stop()` from a `watch(isListening)`; here an effect does,
 *    skipping its initial run to mirror the watcher (which never fires for
 *    the initial `false`).
 * 3. `lang` is a plain option (upstream accepts a `MaybeRefOrGetter`). A
 *    changed language is re-applied while not listening, and `onend`
 *    re-applies the latest value for the next run — same as upstream's
 *    `watch(lang)` + `onend` reset.
 * 4. The unmount cleanup stops the recognition instance directly. Upstream's
 *    `tryOnScopeDispose(stop)` only flips the `isListening` ref — its
 *    `watch(isListening)` is already dead when dispose callbacks run, so a
 *    live browser session keeps listening after unmount upstream. Here the
 *    instance is stopped directly (guarded by the same try/catch as
 *    upstream's start/stop), because a React state flip during unmount
 *    cannot re-run effects.
 * 5. SSR-safe: without a `window` the hook reports `isSupported: false`,
 *    and `start()` / `stop()` only flip `isListening` (upstream keeps the
 *    flag writable with no recognition instance, too).
 *
 * @example
 * const {
 *   isSupported,
 *   isListening,
 *   isFinal,
 *   result,
 *   confidence,
 *   error,
 *   setIsListening,
 *   setError,
 *   start,
 *   stop,
 * } = useSpeechRecognition({ lang: 'en-US' })
 *
 * start()
 */
export declare function useSpeechRecognition(
  options?: UseSpeechRecognitionOptions,
): UseSpeechRecognitionReturn
```
