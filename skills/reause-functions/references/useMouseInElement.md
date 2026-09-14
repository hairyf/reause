---
category: Elements
---

# useMouseInElement

Reactive mouse position related to an element

## Usage

```tsx
import { useMouseInElement } from '@reause/core'
import { useRef } from 'react'

const target = useRef<HTMLDivElement>(null)

const { x, y, elementX, elementY, isOutside } = useMouseInElement(target)
```

```tsx
<div ref={target}>
  <h1>Hello world</h1>
</div>
```

## Type Declarations

```ts
export interface MouseInElementOptions extends UseMouseOptions {
  /**
   * Whether to handle mouse events when the cursor is outside the target element.
   * When enabled, mouse position will continue to be tracked even when outside the element bounds.
   *
   * @default true
   */
  handleOutside?: boolean
  /**
   * Listen to window resize event
   *
   * @default true
   */
  windowScroll?: boolean
  /**
   * Listen to window scroll event
   *
   * @default true
   */
  windowResize?: boolean
}
export interface UseMouseInElementReturn {
  x: number
  y: number
  sourceType: UseMouseSourceType
  elementX: number
  elementY: number
  elementPositionX: number
  elementPositionY: number
  elementHeight: number
  elementWidth: number
  isOutside: boolean
  stop: () => void
}
/**
 * Reactive mouse position related to an element.
 *
 * Map from @vueuse/core `useMouseInElement`
 * (`source/vueuse/packages/core/useMouseInElement/`), which tracks the cursor
 * (through `useMouse(options)`) and reconciles it against the target element's
 * `getClientRects()`: `elementX` / `elementY` are the cursor offset inside the
 * element, `elementPositionX` / `elementPositionY` its top-left corner
 * (`pageXOffset`-corrected for `type: 'page'`), `elementWidth` / `elementHeight`
 * its size, and `isOutside` whether the cursor is inside its bounds
 * (`handleOutside: false` freezes `elementX` / `elementY` while outside). The
 * metrics refresh when the cursor moves, on `scroll` / `resize`, on `style` /
 * `class` mutations (MutationObserver) and on element resize (ResizeObserver).
 *
 * React divergences:
 * - the Vue refs returned by upstream become a plain object of plain values —
 *   read `x`, `y`, `elementX`, `elementY`, `elementPositionX`,
 *   `elementPositionY`, `elementHeight`, `elementWidth`, `isOutside`
 *   (plus `sourceType` and `stop`) directly off the result;
 * - `target` accepts an element or a React ref object (`RefObject<HTMLElement |
 *   null>`) — the React analog of upstream's `ElementRef`; it is re-resolved on
 *   every render, so a `useRef` target that is `null` during the first render
 *   still starts tracking once React attaches the element;
 * - `x` / `y` / `sourceType` come from the house `useMouse` port, which this
 *   hook composes with the same `options` object, so every `UseMouseOptions`
 *   field (`target`, `window`, `type` including a custom
 *   `UseMouseEventExtractor`, `touch`, `scroll`, `resetOnTouchEnds`,
 *   `eventFilter`, `initialValue`) is forwarded exactly like upstream;
 * - `stop()` stops the element observers, the metric refresh and the
 *   `windowScroll` / `windowResize` listeners, but — exactly like upstream's
 *   `stopFnList` — leaves the composed `useMouse` listeners and the document
 *   `mouseleave` handler running, so `x` / `y` and `isOutside` keep updating
 *   after `stop()`;
 * - SSR-safe: nothing touches `window` or the DOM during render — listeners
 *   attach and the initial metrics compute in effects only.
 *
 * @param target - element or React ref object (`{ current }`) returning
 *   the element to measure the mouse position against
 * @param options - `UseMouseOptions` (`target`, `window`, `type` incl. a
 *   custom extractor, `touch`, `scroll`, `resetOnTouchEnds`, `eventFilter`,
 *   `initialValue`) plus `handleOutside` (default `true`) and `windowScroll` /
 *   `windowResize` (default `true`)
 *
 * @example
 * const target = useRef<HTMLDivElement>(null)
 * const { x, y, elementX, elementY, isOutside } = useMouseInElement(target)
 */
export declare function useMouseInElement(
  target?: RefObject<HTMLElement | null | undefined>,
  options?: MouseInElementOptions,
): UseMouseInElementReturn
```
