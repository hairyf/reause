---
category: Sensors
---

# useScroll

Reactive scroll position and state.

## Usage

```tsx
import { useScroll } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLDivElement>(null)
const { x, y, isScrolling, arrivedState, directions } = useScroll(el)
```

### With offsets

```tsx
const { x, y, isScrolling, arrivedState, directions } = useScroll(el, {
  offset: { top: 30, bottom: 30, right: 30, left: 30 },
})
```

### Setting scroll position

Set the `x` and `y` values to make the element scroll to that position.

```tsx
const el = useRef<HTMLDivElement>(null)
const { x, y, setX, setY } = useScroll(el)
```

```tsx
<>
  <button onClick={() => setX(x + 10)}>Scroll right 10px</button>
  <button onClick={() => setY(y + 10)}>Scroll down 10px</button>
</>
```

### Smooth scrolling

Set `behavior: smooth` to enable smooth scrolling. The `behavior` option defaults to `auto`, which means no smooth scrolling. See the `behavior` option on [`window.scrollTo()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo) for more information.

```tsx
const { x, y } = useScroll(el, { behavior: 'smooth' })
```

### Recalculate scroll state

You can call the `measure()` method to manually update the scroll position and `arrivedState` at any time.

This is useful, for example, after dynamic content changes or when you want to recalculate the scroll state outside of scroll events.

```tsx
const { measure } = useScroll(el)

// Inside any function
function updateScrollState() {
  // ...some logic
  measure()
}
```

> [!NOTE]
> it's recommended to call `measure()` inside a `useEffect`, to ensure the DOM is updated first.
> The scroll state is initialized automatically on mount.
> You only need to call `measure()` manually if you want to recalculate the state after some dynamic changes.

## Directive Usage

Not ported — upstream ships a `vScroll` directive (Vue, `v-` directive); in React the hook is used directly.

## Type Declarations

```ts
export type UseScrollElement =
  HTMLElement | SVGElement | Window | Document | null | undefined
export interface UseScrollOptions extends ConfigurableWindow {
  /**
   * Throttle time for scroll event, it's disabled by default.
   *
   * @default 0
   */
  throttle?: number
  /**
   * The check time when scrolling ends.
   * This configuration will be setting to (throttle + idle) when the `throttle` is configured.
   *
   * @default 200
   */
  idle?: number
  /**
   * Offset arrived states by x pixels
   */
  offset?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }
  /**
   * Use MutationObserver to monitor specific DOM changes,
   * such as attribute modifications, child node additions or removals, or subtree changes.
   * @default { mutation: boolean }
   */
  observe?:
    | boolean
    | {
        mutation?: boolean
      }
  /**
   * Trigger it when scrolling.
   */
  onScroll?: (e: Event) => void
  /**
   * Trigger it when scrolling ends.
   */
  onStop?: (e: Event) => void
  /**
   * Listener options for scroll event.
   *
   * @default {capture: false, passive: true}
   */
  eventListenerOptions?: boolean | AddEventListenerOptions
  /**
   * Optionally specify a scroll behavior of `auto` (default, not smooth scrolling) or
   * `smooth` (for smooth scrolling) which takes effect when scrolling via `setX` / `setY`.
   *
   * React divergence: plain value only — upstream also accepts a getter/`ref` here, but
   * this read-only value-source option stays a plain `ScrollBehavior`.
   *
   * @default 'auto'
   */
  behavior?: ScrollBehavior
  /**
   * On error callback
   *
   * Default log error to `console.error`
   */
  onError?: (error: unknown) => void
}
export interface UseScrollReturn {
  /**
   * Current horizontal scroll position.
   */
  x: number
  /**
   * Current vertical scroll position.
   */
  y: number
  /**
   * Whether the element is scrolling. Resets to `false` after `idle`
   * milliseconds without scroll events.
   */
  isScrolling: boolean
  /**
   * Whether the element is arrived at an edge, within `offset` pixels.
   */
  arrivedState: {
    left: boolean
    right: boolean
    top: boolean
    bottom: boolean
  }
  /**
   * Direction of the last scroll movement per axis.
   */
  directions: {
    left: boolean
    right: boolean
    top: boolean
    bottom: boolean
  }
  /**
   * Re-measure the scroll position and recompute `arrivedState` / `directions`.
   */
  measure: () => void
  /**
   * Scroll the element horizontally to `x`.
   */
  setX: (x: number) => void
  /**
   * Scroll the element vertically to `y`.
   */
  setY: (y: number) => void
}
/**
 * Reactive scroll position and state.
 *
 * Map from @vueuse/core `useScroll`
 * (`source/vueuse/packages/core/useScroll/`): tracks the scroll position of an
 * element (or `window` / `document`), whether it is currently scrolling, which
 * edges it has arrived at within `offset` pixels and the per-axis scroll
 * `directions`. The optional `observe` flag registers a MutationObserver that
 * re-measures after DOM changes (attribute, child or subtree mutations).
 *
 * React divergences from upstream:
 *
 * 1. Upstream's writable `x` / `y` computed refs become plain `number` state
 *    plus the `setX` / `setY` callbacks that scroll the element (write the
 *    refs instead). Scroll events are batched by React, so all values settle
 *    together.
 * 2. The `scroll` / `scrollend` listeners are registered inline in a
 *    `useEffect` with cleanup (upstream composes `useEventListener`), and the
 *    idle reset is a `useDebounceFn` from `@reause/shared` (upstream composes
 *    it from `@vueuse/shared` too). The scroll handler is wrapped in a shared
 *    `useThrottleFn` when `throttle > 0`; at `throttle = 0` the raw handler is
 *    registered instead, mirroring upstream.
 * 3. The optional MutationObserver (upstream composes `useMutationObserver`)
 *    is a self-contained observer inside the same effect, disconnected on
 *    unmount.
 * 4. `element` accepts a plain element or a ref-like `{ current }` object
 *    (upstream: `MaybeRefOrGetter`). It is re-resolved on every render
 *    and the listeners re-bind when the resolved element changes, so a
 *    `useRef` target that is `null` during first render still binds once
 *    React attaches the element.
 * 5. SSR-safe: nothing touches `window` or the DOM during render — the
 *    initial measure and the listeners live in the mount effect only.
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const { x, y, isScrolling, arrivedState, directions, measure, setX, setY } = useScroll(el)
 * setX(100) // scroll to x = 100
 */
export declare function useScroll(
  element: RefObject<UseScrollElement | null>,
  options?: UseScrollOptions,
): UseScrollReturn
```
