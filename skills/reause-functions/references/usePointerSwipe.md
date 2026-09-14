---
category: Sensors
---

# usePointerSwipe

Reactive swipe detection based on [PointerEvents](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent)

## Usage

```tsx
import { usePointerSwipe } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLDivElement>(null)
const { isSwiping, direction } = usePointerSwipe(el, {
  threshold: 50,
  onSwipeEnd: (e, direction) => console.log(direction),
})
// direction: 'up' | 'down' | 'left' | 'right' | 'none'
```

## Type Declarations

```ts
interface Position {
  x: number
  y: number
}
export interface UsePointerSwipeOptions {
  /**
   * @default 50
   */
  threshold?: number
  /**
   * Callback on swipe start.
   */
  onSwipeStart?: (e: PointerEvent) => void
  /**
   * Callback on swipe move.
   */
  onSwipe?: (e: PointerEvent) => void
  /**
   * Callback on swipe end.
   */
  onSwipeEnd?: (e: PointerEvent, direction: UseSwipeDirection) => void
  /**
   * Pointer types to listen to.
   *
   * @default ['mouse', 'touch', 'pen']
   */
  pointerTypes?: PointerType[]
  /**
   * Disable text selection on swipe.
   *
   * @default false
   */
  disableTextSelect?: boolean
}
export interface UsePointerSwipeReturn {
  readonly isSwiping: boolean
  readonly direction: UseSwipeDirection
  readonly posStart: Readonly<Position>
  readonly posEnd: Readonly<Position>
  readonly distanceX: number
  readonly distanceY: number
  stop: () => void
}
/**
 * Map from @vueuse/core `usePointerSwipe`
 * (`source/vueuse/packages/core/usePointerSwipe/`).
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   listen on, resolved with the shared `unrefElement`
 * @param options - `threshold` (default `50`), `pointerTypes` (default
 *   `['mouse', 'touch', 'pen']`), `disableTextSelect` (default `false`) and
 *   the `onSwipeStart` / `onSwipe` / `onSwipeEnd` callbacks
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const { isSwiping, direction } = usePointerSwipe(el, {
 *   threshold: 50,
 *   onSwipeEnd: (e, direction) => console.log(direction),
 * })
 */
export declare function usePointerSwipe(
  target: RefObject<HTMLElement | null | undefined>,
  options?: UsePointerSwipeOptions,
): UsePointerSwipeReturn
```
