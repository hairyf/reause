---
category: Sensors
---

# useSpeechSynthesis

Reactive [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)

## Usage

```tsx
import { useSpeechSynthesis } from '@reause/core'

const {
  isSupported,
  isPlaying,
  status,
  utterance,
  error,
  stop,
  toggle,
  speak,
} = useSpeechSynthesis('Hello world')
// speak() — cancels the previous speech, then speaks with the current text/options
```

### Options

The following shows the default values of the options, they will be directly passed to [SpeechSynthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).

```ts
import { useSpeechSynthesis } from '@reause/core'

useSpeechSynthesis('Hello world', {
  lang: 'en-US',
  pitch: 1,
  rate: 1,
  volume: 1,
})
```

## Type Declarations

```ts
export type UseSpeechSynthesisStatus = "init" | "play" | "pause" | "end"
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
 * (`source/vueuse/packages/core/useSpeechSynthesis/`).
 *
 * @example
 * const { isSupported, isPlaying, status, speak } = useSpeechSynthesis('Hello world')
 */
export declare function useSpeechSynthesis(
  text?: string,
  options?: UseSpeechSynthesisOptions,
): UseSpeechSynthesisReturn
```
