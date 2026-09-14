---
category: Sensors
---

# useMouse

Reactive mouse position

## Basic Usage

```tsx
import { useMouse } from '@reause/core'

const { x, y, sourceType } = useMouse()
```

Touch is enabled by default. To only detect mouse changes, set `touch` to `false`.
The `dragover` event is used to track mouse position while dragging.

```tsx
const { x, y } = useMouse({ touch: false })
```

## Custom Extractor

It's also possible to provide a custom extractor function to get the position from the event.

```tsx
import type { UseMouseEventExtractor } from '@reause/core'
import { useMouse } from '@reause/core'
import { useRef } from 'react'

const parentRef = useRef<HTMLDivElement>(null)

const extractor: UseMouseEventExtractor = event => (
  event instanceof MouseEvent
    ? [event.offsetX, event.offsetY]
    : null
)

const { x, y, sourceType } = useMouse({ target: parentRef, type: extractor })
```

## Type Declarations

```ts
export type UseMouseCoordType = "page" | "client" | "screen" | "movement"
export type UseMouseSourceType = "mouse" | "touch" | null
export type UseMouseEventExtractor = (
  event: MouseEvent | Touch,
) => [x: number, y: number] | null | undefined
interface Position {
  x: number
  y: number
}
export interface UseMouseOptions extends ConfigurableWindow {
  /**
   * Mouse position based by page, client, screen, or relative to previous position
   *
   * @default 'page'
   */
  type?: UseMouseCoordType | UseMouseEventExtractor
  /**
   * Listen events on `target` element
   *
   * @default 'Window'
   */
  target?: RefObject<Window | EventTarget | null | undefined>
  /**
   * Listen to `touchmove` events
   *
   * @default true
   */
  touch?: boolean
  /**
   * Listen to `scroll` events on window, only effective on type `page`
   *
   * @default true
   */
  scroll?: boolean
  /**
   * Reset to initial value when `touchend` event fired
   *
   * @default false
   */
  resetOnTouchEnds?: boolean
  /**
   * Initial values
   */
  initialValue?: Position
  /**
   * Filter for if events should to be received (upstream: `ConfigurableEventFilter`).
   */
  eventFilter?: EventFilter
}
export interface UseMouseReturn {
  x: number
  y: number
  sourceType: UseMouseSourceType
}
/**
 * Reactive mouse position.
 *
 * Map from @vueuse/core `useMouse`
 * (`source/vueuse/packages/core/useMouse/`), which listens to
 * `mousemove` / `dragover` (+ `touchstart` / `touchmove` when `touch` is
 * enabled, `touchend` reset when `resetOnTouchEnds` is set) on the `target`
 * option (default `window`), extracts the cursor coordinates with the `type`
 * extractor (`page` by default, or `client` / `screen` / `movement` / a custom
 * `UseMouseEventExtractor`) and tracks which input produced the last position
 * in `sourceType`. A `scroll` listener on `window` compensates the `page`
 * coordinates while the page scrolls.
 *
 * React divergences:
 * - the Vue shallow refs returned by upstream (`x` / `y` / `sourceType`)
 *   become plain values — read `x`, `y` and `sourceType` directly off the
 *   result object;
 * - upstream's `useEventListener` becomes a self-contained mount `useEffect`
 *   that re-subscribes when the resolved `target` / the resolved `window`
 *   option / the `type` mode / the `touch` / `scroll` / `resetOnTouchEnds`
 *   flags change and removes all listeners on unmount;
 * - `target` accepts a plain element or a ref-like `{ current }` object
 *   (upstream: `MaybeRefOrGetter`); it is re-resolved on every render
 *   and the listeners re-bind when the resolved element changes. Not passing
 *   `target` listens on the `window` option (default the global `window`),
 *   while an explicit `null` attaches nothing — exactly like upstream;
 * - `initialValue` is folded into the `useState` initializers and read back
 *   by the `touchend` reset through a latest-value ref, so SSR renders the
 *   defaults (`x: 0`, `y: 0`, `sourceType: null`) without touching `window`;
 * - the `eventFilter` wrapper forwards upstream's placeholder second
 *   argument (`{}`) so a chained filter reads an object instead of
 *   `undefined` (upstream: `eventFilter(() => mouseHandler(event), {} as any)`).
 *
 * @example
 * const { x, y, sourceType } = useMouse()
 */
export declare function useMouse(options?: UseMouseOptions): UseMouseReturn
```
