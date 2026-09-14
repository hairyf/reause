---
category: Elements
---

# useResizeObserver

Reports changes to the dimensions of an Element's content or the border-box

## Usage

```tsx
import { useResizeObserver } from '@reause/core'
import { useRef, useState } from 'react'

const el = useRef<HTMLTextAreaElement | null>(null)
const [text, setText] = useState('')

useResizeObserver(el, (entries) => {
  const { width, height } = entries[0].contentRect
  setText(`width: ${width}, height: ${height}`)
})
```

## Type Declarations

```ts
/**
 * Element types accepted as observation targets. Upstream's `TargetElement` also includes Vue
 * component instances (`VueInstance`) — React refs hold DOM nodes directly, so there is no
 * equivalent here.
 */
export type TargetElement = HTMLElement | SVGElement | undefined | null
/**
 * A React ref object holding an element — the React-native replacement for upstream's
 * `ElementTarget` (in Vue semantics a `MaybeRef`, i.e. a value or a `{ current }` union). reause
 * binds DOM hooks to refs only: a plain element is not accepted, so callers hold the element in a
 * `useRef` and the hook reads it with `unrefElement`. React's `Ref<T>` also unions the callback
 * form (`RefCallback<T>`), which cannot be read synchronously, so it is deliberately excluded here.
 */
export type ElementTarget<T extends TargetElement = TargetElement> =
  RefObject<T | null>
/**
 * A single target or an array of targets —.
 */
export type ElementTargetOrArray<T extends TargetElement = TargetElement> =
  ElementTarget<T> | ElementTarget<T>[]
/**
 * Options for `useResizeObserver`: passthrough of the platform `ResizeObserverOptions` (e.g. `box`)
 * plus a custom `window` instance, e.g. working with iframes or in testing environments.
 */
export interface UseResizeObserverOptions
  extends ResizeObserverOptions, ConfigurableWindow {}
/**
 * Return of `useResizeObserver`. Upstream extends `Supportable` with a `ComputedRef<boolean>`; the
 * React port exposes a plain `boolean` state.
 */
export interface UseResizeObserverReturn {
  /**
   * Whether the current environment supports the `ResizeObserver` API. Starts `false` and settles
   * in a mount effect (SSR-safe).
   */
  isSupported: boolean
  /**
   * Disconnect the observer and stop tracking target changes. Calling it again is a no-op — the
   * hook does not restart after `stop()`.
   */
  stop: () => void
}
/**
 * Map from @vueuse/core `useResizeObserver`
 * (`source/vueuse/packages/core/useResizeObserver/`).
 *
 * @example
 * const el = useRef<HTMLTextAreaElement | null>(null)
 * const [text, setText] = useState('')
 *
 * useResizeObserver(el, (entries) => {
 *   const { width, height } = entries[0].contentRect
 *   setText(`width: ${width}, height: ${height}`)
 * })
 */
export declare function useResizeObserver(
  target: ElementTargetOrArray,
  callback: ResizeObserverCallback,
  options?: UseResizeObserverOptions,
): UseResizeObserverReturn
```
