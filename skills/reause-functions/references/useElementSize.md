---
category: Elements
---

# useElementSize

Reactive size of an HTML element. [ResizeObserver MDN](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)

## Usage

```tsx
import { useElementSize } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLTextAreaElement | null>(null)
const { width, height, stop } = useElementSize(el)
```

The element's size updates as it is resized:

```tsx
import { useElementSize } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLDivElement | null>(null)
const { width, height } = useElementSize(el, { width: 0, height: 0 }, { box: 'border-box' })

// <div ref={el} style={{ resize: 'both', overflow: 'auto' }}>
//   Width: {width}, Height: {height}
// </div>
```

The observer is disconnected automatically on unmount. Call `stop()` to disconnect earlier.

## Type Declarations

```ts
export interface ElementSize {
  width: number
  height: number
}
export interface UseElementSizeOptions extends UseResizeObserverOptions {}
export interface UseElementSizeReturn {
  width: number
  height: number
  stop: () => void
}
/**
 * Map from @vueuse/core `useElementSize`
 * (`source/vueuse/packages/core/useElementSize/`).
 *
 * @example
 * const el = useRef<HTMLTextAreaElement | null>(null)
 * const { width, height, stop } = useElementSize(el)
 */
export declare function useElementSize(
  target: ElementTarget,
  initialSize?: ElementSize,
  options?: UseElementSizeOptions,
): UseElementSizeReturn
```
