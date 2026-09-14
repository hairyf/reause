---
category: Browser
---

# useShare

Reactive [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)

> The `share` method has to be called following a user gesture like a button click. It can't simply be called on page load for example. That's in place to help prevent abuse.

## Usage

```tsx
import { useShare } from '@reause/core'

const { share, isSupported } = useShare()

function startShare() {
  share({
    title: 'Hello',
    text: 'Hello my friend!',
    url: location.href,
  })
}
```

## Type Declarations

```ts
export interface UseShareOptions {
  title?: string
  files?: File[]
  text?: string
  url?: string
}
export interface UseShareReturn {
  /**
   * `true` when the resolved navigator exposes `canShare` — upstream's exact support check.
   * Resolved in a mount effect, so it stays `false` during the first render and on the server
   * (SSR-safe).
   */
  isSupported: boolean
  /**
   * Triggers the Web Share API with the hook options merged under the call-time overrides
   * (overrides win). Resolves `undefined` when unsupported or when `canShare` rejects the data; the
   * promise from `navigator.share` is passed through untouched — a user-cancelled share
   * (AbortError) rejects to the caller, like upstream.
   *
   * Must be called from a user gesture (e.g. a button click).
   */
  share: (overrideOptions?: UseShareOptions) => Promise<void>
}
/**
 * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
 * Declared inline instead of re-exporting upstream's configurable-navigator interface to keep the
 * barrel export collision-free.
 */
interface UseShareNavigatorOptions {
  navigator?: Navigator
}
/**
 * Map from @vueuse/core `useShare`
 * (`source/vueuse/packages/core/useShare/`).
 *
 * @example
 * const { share, isSupported } = useShare()
 *
 * function startShare() {
 *   share({ title: 'Hello', text: 'Hello my friend!', url: location.href })
 * }
 */
export declare function useShare(
  shareOptions?: UseShareOptions,
  options?: UseShareNavigatorOptions,
): UseShareReturn
```
