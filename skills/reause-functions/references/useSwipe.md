---
category: Sensors
---

# useSwipe

Reactive swipe detection based on [`TouchEvents`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent)

## Usage

```tsx
import { useSwipe } from '@reause/core'
import { useRef } from 'react'

function Demo() {
  const el = useRef<HTMLDivElement>(null)
  const { isSwiping, direction } = useSwipe(el)

  return (
    <div ref={el}>
      Swipe here
    </div>
  )
}
```

`target` is a React ref object (`RefObject`) holding the element — bind it to the element you
want to listen on (a `useRef` that is not attached to any node listens to nothing). The resolved
element is re-read after every commit, so a ref that is still `null` while rendering binds as soon
as React attaches the element.

## Options

- `passive` (`boolean`, default `true`): register the touch listeners as passive. When `false`, the
  listeners are registered with `capture: true` and a horizontal `touchmove` calls `preventDefault()`.
- `threshold` (`number`, default `50`): minimum `max(|dx|, |dy|)` in pixels before a touch counts as
  a swipe.
- `onSwipeStart` (`(e: TouchEvent) => void`): called on `touchstart` with a single touch point.
- `onSwipe` (`(e: TouchEvent) => void`): called on `touchmove` while a swipe is in progress.
- `onSwipeEnd` (`(e: TouchEvent, direction: UseSwipeDirection) => void`): called on `touchend` /
  `touchcancel` once the threshold was crossed, with the final direction.

## Return Values

- `isSwiping` (`boolean`): whether a swipe is currently in progress.
- `direction` (`'up' | 'down' | 'left' | 'right' | 'none'`): swipe direction derived from the start
  and end coordinates; `'none'` below the threshold.
- `coordsStart` / `coordsEnd` (`{ x: number, y: number }`): start and last touch coordinates.
- `lengthX` / `lengthY` (`number`): `coordsStart.x - coordsEnd.x` / `coordsStart.y - coordsEnd.y`.
- `stop` (`() => void`): permanently detach the listeners for this hook instance.

## Type Declarations

```ts
export type UseSwipeDirection = "up" | "down" | "left" | "right" | "none"
interface Position {
  x: number
  y: number
}
export interface UseSwipeOptions extends ConfigurableWindow {
  /**
   * Register events as passive
   *
   * @default true
   */
  passive?: boolean
  /**
   * @default 50
   */
  threshold?: number
  /**
   * Callback on swipe start
   */
  onSwipeStart?: (e: TouchEvent) => void
  /**
   * Callback on swipe moves
   */
  onSwipe?: (e: TouchEvent) => void
  /**
   * Callback on swipe ends
   */
  onSwipeEnd?: (e: TouchEvent, direction: UseSwipeDirection) => void
}
export interface UseSwipeReturn {
  isSwiping: boolean
  direction: UseSwipeDirection
  coordsStart: Readonly<Position>
  coordsEnd: Readonly<Position>
  lengthX: number
  lengthY: number
  stop: () => void
}
/**
 * Map from @vueuse/core `useSwipe`.
 *
 * @param target - React ref object (`RefObject`) holding the event target to
 *   listen on, resolved with the shared `unrefElement`
 * @param options - `passive` (default `true`), `threshold` (default `50`) and
 *   the `onSwipeStart` / `onSwipe` / `onSwipeEnd` callbacks
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const { isSwiping, direction, lengthX, lengthY } = useSwipe(el, {
 *   threshold: 50,
 *   onSwipeEnd: (e, direction) => console.log(direction),
 * })
 */
export declare function useSwipe(
  target: RefObject<EventTarget | null | undefined>,
  options?: UseSwipeOptions,
): UseSwipeReturn
```
