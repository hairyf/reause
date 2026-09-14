---
category: Sensors
---

# useInfiniteScroll

Infinite scrolling of the element

## Usage

```tsx
import { useInfiniteScroll } from '@reause/core'
import { useRef, useState } from 'react'

const el = useRef<HTMLDivElement>(null)
const [data, setData] = useState([1, 2, 3, 4, 5, 6])

const { reset } = useInfiniteScroll(el, () => {
  // load more
  setData(d => [...d, ...moreData])
}, {
  distance: 10,
  canLoadMore: () => {
    // indicate when there is no more content to load so onLoadMore stops triggering
    // if (noMoreContent) return false
    return true // for demo purposes
  },
})

function resetList() {
  setData([])
  reset()
}
```

```tsx
<>
  <div ref={el}>
    {data.map(item => <div key={item}>{item}</div>)}
  </div>
  <button onClick={resetList}>Reset</button>
</>
```

## Direction

Different scroll directions require different CSS style settings:

| Direction          | Required CSS                                          |
| ------------------ | ----------------------------------------------------- |
| `bottom` (default) | No special settings required                          |
| `top`              | `display: flex;`<br>`flex-direction: column-reverse;` |
| `left`             | `display: flex;`<br>`flex-direction: row-reverse;`    |
| `right`            | `display: flex;`                                      |

::: warning
Make sure to indicate when there is no more content to load with `canLoadMore`, otherwise `onLoadMore` will trigger as long as there is space for more content.
:::

## Type Declarations

```ts
type InfiniteScrollElement =
  HTMLElement | SVGElement | Window | Document | null | undefined
type Awaitable<T> = T | Promise<T>
export interface UseInfiniteScrollOptions<
  T extends InfiniteScrollElement = InfiniteScrollElement,
> extends UseScrollOptions {
  /**
   * The minimum distance between the bottom of the element and the bottom of the viewport
   *
   * @default 0
   */
  distance?: number
  /**
   * The direction in which to listen the scroll.
   *
   * @default 'bottom'
   */
  direction?: "top" | "bottom" | "left" | "right"
  /**
   * The interval time between two load more (to avoid too many invokes).
   *
   * @default 100
   */
  interval?: number
  /**
   * A function that determines whether more content can be loaded for a specific element.
   * Should return `true` if loading more content is allowed for the given element,
   * and `false` otherwise.
   */
  canLoadMore?: (el: T) => boolean
}
export interface UseInfiniteScrollReturn {
  isLoading: boolean
  reset: () => void
}
/**
 * Reactive infinite scroll.
 *
 * Map from @vueuse/core `useInfiniteScroll`
 * (`source/vueuse/packages/core/useInfiniteScroll/`): calls `onLoadMore`
 * whenever the element is scrolled to the requested edge (within `distance`
 * pixels), is visible in the viewport and `canLoadMore` allows it. The scroll
 * edge detection comes from `useScroll` (the `distance` is folded into the
 * `offset` option of the direction being listened to) and visibility from
 * `useElementVisibility` (`Window` / `Document` targets cannot be observed by
 * an `IntersectionObserver`, so they are reduced to their `documentElement`,
 * mirroring upstream's `resolveElement`).
 *
 * React divergences from upstream:
 *
 * 1. Upstream returns `{ isLoading: ComputedRef<boolean>, reset }` where the
 *    composable is stopped on unmount; here `isLoading` is a plain `boolean`
 *    state value and listeners/observers tear down through the composed
 *    hooks' own unmount effects — no cleanup is returned.
 * 2. Upstream wraps `useScroll` in `reactive` and `watch`es the arrived /
 *    visibility / `canLoad` computationals with an immediate, post-flush
 *    watcher that calls `checkAndLoad`. Here a post-commit `useEffect` on the
 *    same values plays that role: every committed change to the arrived state
 *    (for the listened direction), the visibility boolean, the resolved
 *    `canLoad` predicate or the internal re-check signal re-runs the check.
 *    After `onLoadMore` settles, `measure()` is re-run together with the
 *    re-check signal (single batched commit), which replaces upstream's
 *    `finally → nextTick(checkAndLoad)` re-check after the DOM has grown.
 * 3. `canLoadMore` is evaluated fresh inside the re-check effect against the
 *    element resolved at effect time (upstream caches the predicate result in
 *    a `computed` keyed on `observedElement`), so a swapped predicate is
 *    honored on the next re-check instead of waiting for the element itself
 *    to change.
 * 4. `reset` re-measures and schedules a re-check in one tick (upstream:
 *    `nextTick(() => checkAndLoad())`).
 * 5. SSR-safe: nothing touches `window` or the DOM during render — the
 *    observed element and the effect both resolve through `typeof` guards and
 *    all listeners attach in effects.
 * 6. The upstream `v-infinite-scroll` directive variant is a Vue feature and
 *    is not ported; check the `distance` / `direction` / `canLoadMore`
 *    options instead and call `reset()` from a click handler for the same
 *    per-element behavior.
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const { reset } = useInfiniteScroll(el, () => {
 *   setData(d => [...d, ...moreData])
 * })
 * // reset the list: clear the data and re-check the new (short) content
 * reset()
 */
export declare function useInfiniteScroll<T extends InfiniteScrollElement>(
  element: RefObject<T | null>,
  onLoadMore: (state: UseScrollReturn) => Awaitable<void>,
  options?: UseInfiniteScrollOptions<T>,
): UseInfiniteScrollReturn
```
