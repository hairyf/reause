---
category: Elements
---

# useMutationObserver

Watch for changes being made to the DOM tree

## Usage

```tsx
import { useMutationObserver } from '@reause/core'
import { useRef, useState } from 'react'

const el = useRef<HTMLDivElement | null>(null)
const [messages, setMessages] = useState<string[]>([])

useMutationObserver(el, (mutations) => {
  if (mutations[0])
    setMessages(prev => [...prev, mutations[0].attributeName!])
}, {
  attributes: true,
})
```

## Type Declarations

```ts
/**
 * Target types accepted by `useMutationObserver` (`ElementTarget` / `ElementTargetOrArray`, backed
 * by `TargetElement`) are the canonical React-native definitions shared from `./useResizeObserver`
 * (single source of truth; the previous duplicate local copies were consolidated in the #462
 * audit).
 */
/**
 * Options for `useMutationObserver`: passthrough of the platform `MutationObserverInit` (e.g.
 * `attributes`, `childList`, `subtree`) plus a custom `window` instance, e.g. working with iframes
 * or in testing environments.
 */
export interface UseMutationObserverOptions
  extends MutationObserverInit, ConfigurableWindow {}
/**
 * Return of `useMutationObserver`. Upstream extends `Supportable` with a `ComputedRef<boolean>`;
 * the React port exposes a plain `boolean` state.
 */
export interface UseMutationObserverReturn {
  /**
   * Whether the current environment supports the `MutationObserver` API. Starts `false` and settles
   * in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * Stop observing. Disconnects the observer and stops tracking target changes. Calling it again is
   * a no-op — the hook does not restart after `stop()`.
   */
  stop: () => void
  /**
   * Return all pending mutations records that have not yet been delivered to the callback, then
   * clear them. Returns `undefined` when no observer is active — no target resolved yet, or after
   * `stop()`.
   */
  takeRecords: () => MutationRecord[] | undefined
}
/**
 * Map from @vueuse/core `useMutationObserver`
 * (`source/vueuse/packages/core/useMutationObserver/`).
 *
 * @see https://vueuse.org/core/useMutationObserver/
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
 * @example
 * const el = useRef<HTMLDivElement | null>(null)
 * const [attributes, setAttributes] = useState<string[]>([])
 *
 * useMutationObserver(el, (mutations) => {
 *   if (mutations[0])
 *     setAttributes(prev => [...prev, mutations[0].attributeName!])
 * }, { attributes: true })
 */
export declare function useMutationObserver(
  target: ElementTargetOrArray,
  callback: MutationCallback,
  options?: UseMutationObserverOptions,
): UseMutationObserverReturn
```
