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

## React divergences

The Vue return object (`isSwiping` ref, `direction` / `lengthX` / `lengthY` computeds, reactive
coords) becomes plain values backed by state. React refs are not reactive like Vue's, so a
`ref.current` write that triggers no re-render cannot be observed — re-render (for example through
state) after mutating the ref to re-bind the listeners.

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
 * Reactive swipe detection based on
 * [`TouchEvents`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent).
 *
 * Map from @vueuse/core `useSwipe`
 * React port of VueUse's `useSwipe` (`source/vueuse/packages/core/useSwipe/`),
 * which tracks `touchstart` / `touchmove` / `touchend` + `touchcancel` on the
 * target and derives the swipe `direction` once `max(|dx|, |dy|)` crosses
 * `threshold` (default `50`), comparing the axes: `|dx| > |dy|` decides
 * `left`/`right`, otherwise `up`/`down`. Below the threshold the direction
 * stays `'none'` and `isSwiping` stays `false` — `onSwipeEnd` only fires for
 * touches that actually crossed the threshold (like upstream).
 *
 * React divergences:
 *
 * - the Vue return object (`isSwiping` ref, `direction` / `lengthX` /
 *   `lengthY` computeds, reactive coords) becomes plain values backed by
 *   state, derived during render — the touch listeners live in a
 *   self-contained `useEffect` (upstream composes `useEventListener`) and are
 *   removed on unmount;
 * - `target` accepts an element or a ref-like `{ current }` object
 *   (React equivalent of `MaybeRefOrGetter`). The resolved element is re-read after
 *   every commit and the listeners re-bind when it changes, so a `useRef`
 *   target that is `null` during first render still binds once React attaches
 *   the element. A `ref.current` write that causes no re-render cannot be
 *   observed — React refs are not reactive like upstream's Vue ref — so
 *   re-render (e.g. through state) after mutating it;
 * - `onSwipeStart` / `onSwipe` / `onSwipeEnd` are read through latest-value
 *   refs, so the listeners always call the newest callbacks without
 *   re-binding on renders;
 * - `stop()` permanently detaches the listeners for this hook instance
 *   (upstream stops the `useEventListener` watcher too); a fresh mount
 *   starts listening again;
 * - SSR-safe: nothing touches `window` or the DOM during render — listeners
 *   attach in the mount effect only.
 *
 * @param target - element or ref-like `{ current }` object returning
 *   the event target to listen on
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
