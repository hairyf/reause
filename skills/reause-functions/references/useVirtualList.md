---
category: Component
---

# useVirtualList

Create virtual lists with ease. Virtual lists (sometimes called [_virtual scrollers_](https://vue-virtual-scroller-demo.netlify.app/)) allow you to render a large number of items performantly. They only render the minimum number of DOM nodes necessary to show the items within the `container` element by using the `wrapper` element to emulate the container element's full height.

::: warning
Consider using [`@tanstack/react-virtual`](https://tanstack.com/virtual/latest) instead, if you are looking for more features.
:::

## Usage

### Simple list

```tsx
import { useVirtualList } from '@reause/core'

const { list, containerProps, wrapperProps } = useVirtualList(
  Array.from(Array.from({ length: 99999 }).keys()),
  {
    // Keep `itemHeight` in sync with the item's row.
    itemHeight: 22,
  },
)
```

```tsx
<div {...containerProps} style={{ ...containerProps.style, height: '300px' }}>
  <div {...wrapperProps}>
    {list.map(item => (
      // `item` is `{ data, index }` — `index` is the absolute index
      <div key={item.index} style={{ height: 22 }}>
        Row:
        {' '}
        {item.data}
      </div>
    ))}
  </div>
</div>
```

### Config

| State      | Type     | Description                                                                                     |
| ---------- | -------- | ----------------------------------------------------------------------------------------------- |
| itemHeight | `number` | ensure that the total height of the `wrapper` element is calculated correctly.\*                |
| itemWidth  | `number` | ensure that the total width of the `wrapper` element is calculated correctly.\*                 |
| overscan   | `number` | number of pre-rendered DOM nodes. Prevents whitespace between items if you scroll very quickly. |

\* The `itemHeight` or `itemWidth` must be kept in sync with the height of each row rendered. If you are seeing extra whitespace or jitter when scrolling to the bottom of the list, ensure the `itemHeight` or `itemWidth` is the same height as the row.

### Source Forms

`list` is a read-only value source and takes a plain `readonly T[]`. Resolve a React ref or state value at the call site:

```tsx
const [items, setItems] = useState(allItems)

const { list } = useVirtualList(items, { itemHeight: 22 })
const { list: refList } = useVirtualList(itemsRef.current, { itemHeight: 22 })
```

### Reactive list

```tsx
import { useVirtualList } from '@reause/core'
import { useMemo, useState } from 'react'

const allItems = Array.from(Array.from({ length: 99999 }).keys())
const [showEven, setShowEven] = useState(true)
const filteredList = useMemo(() => allItems.filter(i => (showEven ? i % 2 === 0 : i % 2 === 1)), [showEven])

const { list, containerProps, wrapperProps } = useVirtualList(
  filteredList,
  { itemHeight: 22 },
)
```

### Horizontal list

```tsx
import { useVirtualList } from '@reause/core'

const allItems = Array.from(Array.from({ length: 99999 }).keys())

const { list, containerProps, wrapperProps } = useVirtualList(
  allItems,
  { itemWidth: 200 },
)
```

```tsx
<div {...containerProps} style={{ ...containerProps.style, height: '300px' }}>
  <div {...wrapperProps}>
    {list.map(item => (
      <div key={item.index} style={{ width: 200 }}>
        Row:
        {' '}
        {item.data}
      </div>
    ))}
  </div>
</div>
```

### Scrolling to a specific item

`scrollTo(index, options?)` scrolls the container so the item at `index`
becomes visible, supporting `behavior` (`'auto' | 'smooth'`), `block`
(vertical alignment: `'start' | 'center' | 'end' | 'nearest'`) and `inline`
(horizontal alignment).

## Type Declarations

```ts
type UseVirtualListItemSize = number | ((index: number) => number)
export interface UseHorizontalVirtualListOptions extends UseVirtualListOptionsBase {
  /**
   * item width, accept a pixel value or a function that returns the width
   *
   * @default 0
   */
  itemWidth: UseVirtualListItemSize
}
export interface UseVerticalVirtualListOptions extends UseVirtualListOptionsBase {
  /**
   * item height, accept a pixel value or a function that returns the height
   *
   * @default 0
   */
  itemHeight: UseVirtualListItemSize
}
export interface UseVirtualListOptionsBase {
  /**
   * the extra buffer items outside of the view area
   *
   * @default 5
   */
  overscan?: number
}
export type UseVirtualListOptions =
  UseHorizontalVirtualListOptions | UseVerticalVirtualListOptions
export interface UseVirtualListItem<T> {
  data: T
  index: number
}
export interface UseVirtualListScrollToOptions {
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
  inline?: ScrollLogicalPosition
}
export interface UseVirtualListReturn<T> {
  /**
   * The currently visible window of items (plus `overscan`), each with its original `data` and its
   * absolute `index` into the source list. A plain array — there is no `.value` wrapper.
   */
  list: UseVirtualListItem<T>[]
  /**
   * Scroll the container so the item at `index` becomes visible.
   */
  scrollTo: (index: number, options?: UseVirtualListScrollToOptions) => void
  containerProps: {
    /**
     * Ref callback to attach to the scroll container element. Spread `containerProps` onto the
     * container `<div>` — `ref` is a ref callback exposing the container element.
     */
    ref: (element: HTMLElement | null) => void
    onScroll: () => void
    style: CSSProperties
  }
  wrapperProps: {
    style: CSSProperties
  }
}
/**
 * Map from @vueuse/core `useVirtualList`
 * (`source/vueuse/packages/core/useVirtualList/`).
 *
 * @param list - the source array (a read-only value source — resolve a React
 *   ref or state value at the call site); the latest value is read on every
 *   render
 * @param options - `itemHeight` (vertical) or `itemWidth` (horizontal) as a
 *   fixed pixel size or an `(index) => size` function, plus the `overscan`
 *   buffer (`@default 5`)
 *
 * @example
 * const { list, containerProps, wrapperProps } = useVirtualList(
 *   Array.from(Array.from({ length: 99999 }).keys()),
 *   {
 *     // Keep `itemHeight` in sync with the item's row.
 *     itemHeight: 22,
 *   },
 * )
 *
 * // <div {...containerProps} style={{ ...containerProps.style, height: '300px' }}>
 * //   <div {...wrapperProps}>
 * //     {list.map(item => <div key={item.index} style={{ height: 22 }}>Row: {item.data}</div>)}
 * //   </div>
 * // </div>
 */
export declare function useVirtualList<T = any>(
  list: readonly T[],
  options: UseVirtualListOptions,
): UseVirtualListReturn<T>
```
