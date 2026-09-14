import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

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

export type UseVirtualListOptions = UseHorizontalVirtualListOptions | UseVerticalVirtualListOptions

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

const defaultScrollToOptions: UseVirtualListScrollToOptions = { behavior: 'auto', block: 'start', inline: 'nearest' }

/**
 * Returns the first index whose item "starts" at or after `scrollDirection`, plus one —. The `+ 1`
 * keeps the formula identical to VueUse; it is compensated by the overscan below.
 */
function getOffset<T>(source: readonly T[], itemSize: UseVirtualListItemSize, scrollDirection: number): number {
  if (typeof itemSize === 'number')
    return Math.floor(scrollDirection / itemSize) + 1

  let sum = 0
  let offset = 0

  for (let i = 0; i < source.length; i++) {
    const size = itemSize(i)
    sum += size
    if (sum >= scrollDirection) {
      offset = i
      break
    }
  }
  return offset + 1
}

/**
 * How many items fit in `containerSize`, counted from `start` —.
 */
function getViewCapacity<T>(
  start: number,
  source: readonly T[],
  itemSize: UseVirtualListItemSize,
  containerSize: number,
): number {
  if (typeof itemSize === 'number')
    return Math.ceil(containerSize / itemSize)

  let sum = 0
  let capacity = 0
  for (let i = start; i < source.length; i++) {
    const size = itemSize(i)
    sum += size
    capacity = i
    if (sum > containerSize)
      break
  }
  return capacity - start
}

/**
 * The pixel offset at which the item at `index` starts —.
 */
function getDistance<T>(source: readonly T[], itemSize: UseVirtualListItemSize, index: number): number {
  if (typeof itemSize === 'number')
    return index * itemSize

  return source
    .slice(0, index)
    .reduce((sum, _, i) => sum + itemSize(i), 0)
}

/**
 * Total size of every item —.
 */
function getTotalSize<T>(source: readonly T[], itemSize: UseVirtualListItemSize): number {
  if (typeof itemSize === 'number')
    return source.length * itemSize

  return source.reduce((sum, _, index) => sum + itemSize(index), 0)
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
export function useVirtualList<T = any>(list: readonly T[], options: UseVirtualListOptions): UseVirtualListReturn<T> {
  const isVertical = 'itemHeight' in options
  const itemSize: UseVirtualListItemSize = isVertical ? options.itemHeight : options.itemWidth
  const overscan = options.overscan ?? 5

  const containerRef = useRef<HTMLElement | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const observedRef = useRef<HTMLElement | null>(null)

  const [containerSize, setContainerSize] = useState(0)
  const [scrollPosition, setScrollPosition] = useState(0)

  // latest-value refs, re-synced on every render so the stable callbacks
  // below always read the newest source / item-size / orientation
  const sourceRef = useRef<readonly T[]>([])
  const itemSizeRef = useRef<UseVirtualListItemSize>(itemSize)
  const overscanRef = useRef(overscan)
  const isVerticalRef = useRef(isVertical)
  const rangeRef = useRef({ start: 0, end: 0 })
  isVerticalRef.current = isVertical
  sourceRef.current = list ?? []
  itemSizeRef.current = itemSize
  overscanRef.current = overscan

  /**
   * (re-)attach a `ResizeObserver` so size changes recalc the window. The recalculation itself is
   * derived during render from `containerSize` / `scrollPosition` state, so this effect only needs
   * to keep the observer in sync.
   */
  useEffect(() => {
    const element = containerRef.current
    if (element === observedRef.current)
      return
    observerRef.current?.disconnect()
    observerRef.current = null
    observedRef.current = element
    if (element && typeof ResizeObserver !== 'undefined' && element instanceof Element) {
      try {
        const observer = new ResizeObserver(() => {
          const el = containerRef.current
          if (el)
            setContainerSize(isVerticalRef.current ? el.clientHeight : el.clientWidth)
        })
        observer.observe(element)
        observerRef.current = observer
      }
      catch {
        // not an observable element (e.g. a test double) — keep measuring on
        // demand through scrollTo / the ref callback
      }
    }
  })

  // Disconnect on unmount (upstream: `tryOnScopeDispose(stop)`).
  useEffect(() => () => {
    observerRef.current?.disconnect()
    observerRef.current = null
  }, [])

  /**
   * Ref callback spread onto the container element. Stores the element and mirrors its current size
   * / offset into state so the render-derived window updates as soon as the element attaches.
   */
  const setContainerRef = useCallback((element: HTMLElement | null): void => {
    containerRef.current = element
    if (element) {
      const vertical = isVerticalRef.current
      setContainerSize(vertical ? element.clientHeight : element.clientWidth)
      setScrollPosition((vertical ? element.scrollTop : element.scrollLeft) ?? 0)
    }
    else {
      setContainerSize(0)
    }
  }, [])

  const scrollTo = useCallback((index: number, options: UseVirtualListScrollToOptions = defaultScrollToOptions): void => {
    const element = containerRef.current
    if (!element)
      return

    const merged = { ...defaultScrollToOptions, ...options }
    const source = sourceRef.current
    const size = itemSizeRef.current
    const vertical = isVerticalRef.current

    let offset = 0
    const axisToCheck = merged[vertical ? 'block' : 'inline']
    if (axisToCheck) {
      const containerSize = vertical ? element.clientHeight : element.clientWidth
      const fullItemSize = typeof size === 'number' ? size : size(index)

      if (axisToCheck === 'center') {
        offset = (containerSize / 2) - (fullItemSize / 2)
      }
      else if (axisToCheck === 'end') {
        offset = containerSize - fullItemSize
      }
      else if (axisToCheck === 'nearest') {
        const containerScrollPosition = vertical ? element.scrollTop : element.scrollLeft
        if (getDistance(source, size, index) > containerScrollPosition + (containerSize / 2))
          offset = containerSize - fullItemSize
      }
    }

    const distance = getDistance(source, size, index) - offset
    if (vertical)
      element.scrollTo({ top: distance, behavior: merged.behavior })
    else
      element.scrollTo({ left: distance, behavior: merged.behavior })

    // Mirror the element's (post-scroll) position into state so the
    // render-derived window updates (upstream: `calculateRange()` right after
    // `scrollTo`). Reading back keeps `smooth` behavior faithful.
    setScrollPosition((vertical ? element.scrollTop : element.scrollLeft) ?? 0)
    setContainerSize(vertical ? element.clientHeight : element.clientWidth)
  }, [])

  // -- render-derived window (upstream: computed refs + `state`) -------------
  const source = list ?? []
  const offset = getOffset(source, itemSize, scrollPosition)
  const viewCapacity = getViewCapacity(rangeRef.current.start, source, itemSize, containerSize)

  const from = offset - overscan
  const to = offset + viewCapacity + overscan
  const start = from < 0 ? 0 : from
  const end = to > source.length ? source.length : to
  rangeRef.current = { start, end }

  const currentList = source
    .slice(start, end)
    .map((ele, index) => ({
      data: ele,
      index: index + start,
    }))

  const offsetDistance = getDistance(source, itemSize, start)
  const totalSize = getTotalSize(source, itemSize)

  const containerProps = {
    ref: setContainerRef,
    onScroll: () => {
      const element = containerRef.current
      if (!element)
        return
      const vertical = isVerticalRef.current
      setScrollPosition((vertical ? element.scrollTop : element.scrollLeft) ?? 0)
      setContainerSize(vertical ? element.clientHeight : element.clientWidth)
    },
    style: isVertical ? { overflowY: 'auto' as const } : { overflowX: 'auto' as const },
  }

  const wrapperProps = isVertical
    ? {
        style: {
          width: '100%',
          height: `${totalSize - offsetDistance}px`,
          marginTop: `${offsetDistance}px`,
        },
      }
    : {
        style: {
          height: '100%',
          width: `${totalSize - offsetDistance}px`,
          marginLeft: `${offsetDistance}px`,
          display: 'flex',
        },
      }

  return {
    list: currentList,
    scrollTo,
    containerProps,
    wrapperProps,
  }
}
