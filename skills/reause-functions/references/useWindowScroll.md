---
category: Elements
---

# useWindowScroll

Reactive window scroll

## Usage

```tsx
import { useWindowScroll } from '@reause/core'

const { x, y, isScrolling, arrivedState, directions, setX, setY } = useWindowScroll()

// read the current scroll position: x, y
setX(100) // scroll X to 100
setY(100) // scroll Y to 100
```

## Type Declarations

```ts
export interface UseWindowScrollOptions {
  /**
   * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
   */
  window?: Window
  /**
   * Throttle time for scroll event, it's disabled by default.
   *
   * @default 0
   */
  throttle?: number
  /**
   * The check time when scrolling ends. This configuration will be setting to (throttle + idle)
   * when the `throttle` is configured.
   *
   * @default 200
   */
  idle?: number
  /**
   * Offset arrived states by x pixels
   *
   * @default { left: 0, right: 0, top: 0, bottom: 0 }
   */
  offset?: {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }
  /**
   * Use MutationObserver to monitor specific DOM changes, such as attribute modifications, child
   * node additions or removals, or subtree changes.
   *
   * Accepted for signature parity with upstream, but has no effect here: upstream's `useScroll`
   * only registers the observer when the target is an element other than `window`/`document`, and
   * `useWindowScroll` always targets the window.
   *
   * @default { mutation: false }
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
   * Optionally specify a scroll behavior of `auto` (default, not smooth scrolling) or `smooth` (for
   * smooth scrolling) which takes effect when scrolling with the `setX` / `setY` setters.
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
export interface UseWindowScrollReturn {
  /**
   * Current horizontal scroll position of the window.
   */
  x: number
  /**
   * Current vertical scroll position of the window.
   */
  y: number
  /**
   * Whether the window is scrolling. Resets to `false` after `idle` milliseconds without scroll
   * events.
   */
  isScrolling: boolean
  /**
   * Whether the window is arrived at an edge, within `offset` pixels.
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
   * Re-measure the current scroll position and refresh `arrivedState` / `directions` / `x` / `y`.
   */
  measure: () => void
  /**
   * Scroll the window horizontally to `x`.
   */
  setX: (x: number) => void
  /**
   * Scroll the window vertically to `y`.
   */
  setY: (y: number) => void
}
/**
 * Map from @vueuse/core `useWindowScroll`
 * (`source/vueuse/packages/core/useWindowScroll/`).
 *
 * @example
 * const { x, y, isScrolling, arrivedState, directions, measure, setX, setY } = useWindowScroll()
 * setY(y + 200) // scroll down 200px more
 */
export declare function useWindowScroll(
  options?: UseWindowScrollOptions,
): UseWindowScrollReturn
```
