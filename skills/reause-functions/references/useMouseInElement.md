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
   * Whether to handle mouse events when the cursor is outside the target element. When enabled,
   * mouse position will continue to be tracked even when outside the element bounds.
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
 * Map from @vueuse/core `useMouseInElement`
 * (`source/vueuse/packages/core/useMouseInElement/`).
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   measure the mouse position against, resolved with the shared `unrefElement`
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
