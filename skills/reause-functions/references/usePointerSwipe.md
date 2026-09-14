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
 * Reactive swipe detection based on
 * [`PointerEvents`](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent).
 *
 * Map from @vueuse/core `usePointerSwipe`
 * React port of VueUse's `usePointerSwipe`
 * (`source/vueuse/packages/core/usePointerSwipe/`), which tracks
 * `pointerdown` / `pointermove` / `pointerup` + `pointercancel` on the target
 * and derives the swipe `direction` once `max(|dx|, |dy|)` crosses
 * `threshold` (default `50`), comparing the axes: `|dx| > |dy|` decides
 * `left`/`right`, otherwise `up`/`down`. Below the threshold the direction
 * stays `'none'` and `isSwiping` stays `false` — `onSwipeEnd` only fires for
 * swipes that actually crossed the threshold (like upstream).
 *
 * React divergences:
 *
 * - the Vue return object (`isSwiping` shallow ref, `direction` / `distanceX`
 *   / `distanceY` computeds, reactive `posStart` / `posEnd`) becomes a plain
 *   object of plain values backed by state, derived during render — the
 *   pointer listeners live in a self-contained `useEffect` (upstream composes
 *   `useEventListener`) and are removed on unmount;
 * - `target` accepts an element or a ref-like `{ current }` object
 *   (React equivalent of `MaybeRefOrGetter`). It is re-resolved on every
 *   render and the listeners re-bind when the resolved element changes;
 *   ref-likes are re-read at bind time, so a `useRef` target that is `null`
 *   during first render still binds once React attaches the element;
 * - `onSwipeStart` / `onSwipe` / `onSwipeEnd` are read through latest-value
 *   refs, so the listeners always call the newest callbacks without
 *   re-binding on renders;
 * - `pointerTypes` filters events like upstream (`eventIsAllowed`), but unlike
 *   upstream the pointer listeners are removed by `stop()` too;
 * - `stop()` permanently detaches the listeners for this hook instance
 *   (upstream stops the `useEventListener` watcher too); a fresh mount
 *   starts listening again;
 * - SSR-safe: nothing touches `window` or the DOM during render — listeners
 *   attach and the `touch-action` / `user-select` styles are applied in the
 *   mount effect only.
 *
 * @param target - element or ref-like `{ current }` object returning
 *   the element to listen on
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
