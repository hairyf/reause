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
 * Structural subset of the Web Speech API `SpeechRecognition` interface — `lib.dom` does not ship
 * the global type yet (it only defines `SpeechRecognitionResult(List)` and
 * `SpeechRecognitionAlternative`), so this mirrors upstream's local `types.ts` instead of adding
 * ambient declarations.
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
   * Controls whether interim results should be returned (true) or not (false.) Interim results are
   * results that are not yet final
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
   * Setter for `isListening` — the React mapping of upstream's writable `isListening` ref. Takes a
   * plain value or a functional updater (like a React `useState` setter, `prev => next`).
   * `setIsListening(true)` starts the recognition instance, `false` stops it — the same effect as
   * `start()` / `stop()`.
   */
  setIsListening: Dispatch<SetStateAction<boolean>>
  isFinal: boolean
  /**
   * The underlying SpeechRecognition instance — created once during the first render when the API
   * is available, `undefined` otherwise.
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
   * Setter for `error` — the React mapping of upstream's writable `error` ref. Takes a plain value
   * or a functional updater (like a React `useState` setter, `prev => next`).
   */
  setError: Dispatch<
    SetStateAction<SpeechRecognitionErrorEvent | Error | undefined>
  >
  toggle: (value?: boolean) => void
  start: () => void
  stop: () => void
}
/**
 * Map from @vueuse/core `useSpeechRecognition`
 * (`source/vueuse/packages/core/useSpeechRecognition/`).
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
