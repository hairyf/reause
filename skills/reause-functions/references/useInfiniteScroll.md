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
   * A function that determines whether more content can be loaded for a specific element. Should
   * return `true` if loading more content is allowed for the given element, and `false` otherwise.
   */
  canLoadMore?: (el: T) => boolean
}
export interface UseInfiniteScrollReturn {
  isLoading: boolean
  reset: () => void
}
/**
 * Map from @vueuse/core `useInfiniteScroll`
 * (`source/vueuse/packages/core/useInfiniteScroll/`).
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
