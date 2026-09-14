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
 * Reactive infinite scroll.
 *
 * Map from @vueuse/core `useInfiniteScroll`
 * (`source/vueuse/packages/core/useInfiniteScroll/`): calls `onLoadMore`
 * whenever the element is scrolled to the requested edge (within `distance` pixels), is visible in
 * the viewport and `canLoadMore` allows it. The scroll edge detection comes from `useScroll` (the
 * `distance` is folded into the `offset` option of the direction being listened to) and visibility
 * from `useElementVisibility` (`Window` / `Document` targets cannot be observed by an
 * `IntersectionObserver`, so they are reduced to their `documentElement`, mirroring upstream's
 * `resolveElement`).
 *
 * 1. Upstream returns `{ isLoading: ComputedRef<boolean>, reset }` where the composable; here
 * `isLoading` is a plain `boolean` state value and listeners/observers tear down through the
 * composed hooks' own unmount effects — no cleanup is returned. 2. Upstream wraps `useScroll` in
 * `reactive` and `watch`es the arrived / visibility / `canLoad` computationals with an immediate,
 * post-flush watcher that calls `checkAndLoad`. Here a post-commit `useEffect` on the same values
 * plays that role: every committed change to the arrived state (for the listened direction), the
 * visibility boolean, the resolved `canLoad` predicate or the internal re-check signal re-runs the
 * check. After `onLoadMore` settles, `measure()` is re-run together with the re-check signal
 * (single batched commit), which replaces upstream's `finally → nextTick(checkAndLoad)` re-check
 * after the DOM has grown. 3. `canLoadMore` is evaluated fresh inside the re-check effect against
 * the element resolved at effect time (upstream caches the predicate result in a `computed` keyed
 * on `observedElement`), so a swapped predicate is honored on the next re-check instead of waiting
 * for the element itself to change. 4. `reset` re-measures and schedules a re-check in one tick. 5.
 * SSR-safe: nothing touches `window` or the DOM during render — the observed element and the effect
 * both resolve through `typeof` guards and all listeners attach in effects. 6. The upstream
 * `v-infinite-scroll` directive variant is a Vue feature and is not ported; check the `distance` /
 * `direction` / `canLoadMore` options instead and call `reset()` from a click handler for the same
 * per-element behavior.
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
