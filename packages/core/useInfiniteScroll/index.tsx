import type { RefObject } from 'react'
import type { UseScrollOptions, UseScrollReturn } from '../useScroll'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'
import { useElementVisibility } from '../useElementVisibility'
import { useScroll } from '../useScroll'

type InfiniteScrollElement = HTMLElement | SVGElement | Window | Document | null | undefined

type Awaitable<T> = T | Promise<T>

// hoisted so the destructuring default keeps a stable identity across renders
// (an inline `() => true` default would churn the effect dependency)
const defaultCanLoadMore = () => true

/**
 * Resolve a scroll target down to an element that can be observed by an `IntersectionObserver`
 * (`_resolve-element.ts`): `Window` and `Document` are reduced to their `documentElement` because
 * they cannot be observed directly.
 */
function resolveObservedElement(
  el: InfiniteScrollElement,
): HTMLElement | SVGElement | null | undefined {
  if (typeof Window !== 'undefined' && el && el instanceof Window)
    return el.document.documentElement
  if (typeof Document !== 'undefined' && el && el instanceof Document)
    return el.documentElement
  return el as HTMLElement | SVGElement | null | undefined
}

export interface UseInfiniteScrollOptions<T extends InfiniteScrollElement = InfiniteScrollElement> extends UseScrollOptions {
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
  direction?: 'top' | 'bottom' | 'left' | 'right'

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
export function useInfiniteScroll<T extends InfiniteScrollElement>(
  element: RefObject<T | null>,
  onLoadMore: (state: UseScrollReturn) => Awaitable<void>,
  options: UseInfiniteScrollOptions<T> = {},
): UseInfiniteScrollReturn {
  const {
    direction = 'bottom',
    interval = 100,
    canLoadMore = defaultCanLoadMore,
  } = options

  const state = useScroll(element, {
    ...options,
    offset: {
      [direction]: options.distance ?? 0,
      ...options.offset,
    },
  })

  const [isLoading, setIsLoading] = useState(false)
  const [checkTick, setCheckTick] = useState(0)

  // latest-value refs synced each render so the effect and the async load
  // always read the newest options / element without re-subscribing
  const elementRef = useRef(element)
  elementRef.current = element
  const directionRef = useRef(direction)
  directionRef.current = direction
  const intervalRef = useRef(interval)
  intervalRef.current = interval
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore
  const stateRef = useRef(state)
  stateRef.current = state
  const isLoadingRef = useRef(isLoading)
  isLoadingRef.current = isLoading

  // Document and Window cannot be observed by IntersectionObserver
  const observedElement = resolveObservedElement(element ? unrefElement(element) : undefined)
  const isElementVisible = useElementVisibility({ current: observedElement })

  // the resolved element drives `useElementVisibility` at render time; the
  // `canLoadMore` predicate itself is evaluated fresh inside the re-check
  // effect against the element attached by then, so a swapped predicate is
  // honored on the next re-check
  const canLoadMoreRef = useRef(canLoadMore)
  canLoadMoreRef.current = canLoadMore

  // committed value for the listened direction — the effect only re-runs when
  // it (or another dependency) actually changes, like upstream's watch source
  const arrived = state.arrivedState[direction]

  useEffect(() => {
    const currentState = stateRef.current
    const el = resolveObservedElement(elementRef.current ? unrefElement(elementRef.current) : undefined)
    const canLoad = el ? canLoadMoreRef.current(el as T) : false
    if (!el || !isElementVisible || !canLoad || isLoadingRef.current)
      return

    const {
      scrollHeight,
      clientHeight,
      scrollWidth,
      clientWidth,
    } = el
    const currentDirection = directionRef.current
    const isNarrower = (currentDirection === 'bottom' || currentDirection === 'top')
      ? scrollHeight <= clientHeight
      : scrollWidth <= clientWidth

    if (!(arrived || isNarrower))
      return

    isLoadingRef.current = true
    setIsLoading(true)
    void Promise.all([
      onLoadMoreRef.current(currentState),
      new Promise(resolve => setTimeout(resolve, intervalRef.current)),
    ])
      .finally(() => {
        isLoadingRef.current = false
        setIsLoading(false)
        // re-measure (the DOM likely changed after `onLoadMore`) and schedule
        // a re-check in the same batched commit, so the next pass sees the
        // post-load dimensions — upstream: `finally → nextTick(checkAndLoad)`
        currentState.measure()
        setCheckTick(t => t + 1)
      })
  }, [arrived, isElementVisible, observedElement, checkTick, canLoadMore])

  const reset = useCallback(() => {
    // upstream: `nextTick(() => checkAndLoad())` — re-measure the (possibly
    // reset) content and schedule a re-check in the same batched commit
    stateRef.current.measure()
    setCheckTick(t => t + 1)
  }, [])

  return {
    isLoading,
    reset,
  }
}
