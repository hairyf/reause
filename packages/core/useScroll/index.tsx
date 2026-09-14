import type { ConfigurableWindow } from '@reause/shared'
import type { RefObject } from 'react'
import { noop, useDebounceFn, useThrottleFn } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * We have to check if the scroll amount is close enough to some threshold in order to more
 * accurately calculate arrivedState. This is because scrollTop/scrollLeft are non-rounded numbers,
 * while scrollHeight/scrollWidth and clientHeight/clientWidth are rounded.
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#determine_if_an_element_has_been_totally_scrolled
 */
const ARRIVED_STATE_THRESHOLD_PIXELS = 1

export type UseScrollElement = HTMLElement | SVGElement | Window | Document | null | undefined

export interface UseScrollOptions extends ConfigurableWindow {
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
   * @default { mutation: boolean }
   */
  observe?: boolean | {
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
   * smooth scrolling) which takes effect when scrolling via `setX` / `setY`.
   *
   * React divergence: plain value only — upstream also accepts a getter/`ref` here, but this
   * read-only value-source option stays a plain `ScrollBehavior`.
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
   * Whether the element is scrolling. Resets to `false` after `idle` milliseconds without scroll
   * events.
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
 * element (or `window` / `document`), whether it is currently scrolling, which edges it has arrived
 * at within `offset` pixels and the per-axis scroll `directions`. The optional `observe` flag
 * registers a MutationObserver that re-measures after DOM changes (attribute, child or subtree
 * mutations).
 *
 * 1. Upstream's writable `x` / `y` computed refs become plain `number` state plus the `setX` /
 * `setY` callbacks that scroll the element (write the refs instead). Scroll events are batched by
 * React, so all values settle together. 2. The `scroll` / `scrollend` listeners are registered
 * inline in a `useEffect` with cleanup, and the idle reset is a `useDebounceFn` from
 * `@reause/shared`. The scroll handler is wrapped in a shared `useThrottleFn` when `throttle > 0`;
 * at `throttle = 0` the raw handler is registered instead, mirroring upstream. 3. The optional
 * MutationObserver is a self-contained observer inside the same effect, disconnected on unmount. 4.
 * `element` accepts a React ref object (`RefObject`) holding the element. It is re-resolved on
 * every render and the listeners re-bind when the resolved element changes, so a `useRef` target
 * that is `null` during first render still binds once React attaches the element. A plain element,
 * a getter and a callback ref are not accepted. 5. SSR-safe: nothing touches `window` or the DOM
 * during render — the initial measure and only.
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const { x, y, isScrolling, arrivedState, directions, measure, setX, setY } = useScroll(el)
 * setX(100) // scroll to x = 100
 */
export function useScroll(
  element: RefObject<UseScrollElement | null>,
  options: UseScrollOptions = {},
): UseScrollReturn {
  const {
    throttle = 0,
    idle = 200,
    onStop = noop,
    onScroll = noop,
    offset = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    observe: _observe = {
      mutation: false,
    },
    eventListenerOptions = {
      capture: false,
      passive: true,
    },
    behavior = 'auto',
    window: customWindow,
    onError = (e) => { console.error(e) },
  } = options

  const observe = typeof _observe === 'boolean'
    ? {
        mutation: _observe,
      }
    : _observe

  // latest-value refs synced each render so the listeners registered in the
  // mount effect always read the newest options / element (stable handler
  // identities, no re-subscription on option-only renders)
  const elementRef = useRef(element)
  elementRef.current = element
  const windowRef = useRef<Window | undefined>(undefined)
  windowRef.current = customWindow ?? (typeof window === 'undefined' ? undefined : window)
  const offsetRef = useRef(offset)
  offsetRef.current = offset
  const behaviorRef = useRef(behavior)
  behaviorRef.current = behavior
  const onScrollRef = useRef(onScroll)
  onScrollRef.current = onScroll
  const onStopRef = useRef(onStop)
  onStopRef.current = onStop
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const eventListenerOptionsRef = useRef(eventListenerOptions)
  eventListenerOptionsRef.current = eventListenerOptions
  const observeRef = useRef(observe)
  observeRef.current = observe

  const [x, setXState] = useState(0)
  const [y, setYState] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [arrivedState, setArrivedState] = useState({
    left: true,
    right: false,
    top: true,
    bottom: false,
  })
  const [directions, setDirections] = useState({
    left: false,
    right: false,
    top: false,
    bottom: false,
  })

  // internal mirrors read synchronously by the scroll handler, the setters
  // and `measure` — updated before React flushes the state below
  const xRef = useRef(0)
  const yRef = useRef(0)
  const isScrollingRef = useRef(false)

  const scrollTo = useCallback((_x: number | undefined, _y: number | undefined) => {
    const win = windowRef.current
    if (!win)
      return

    const _element = unrefElement(elementRef.current)
    if (!_element)
      return

    (_element instanceof Document ? win.document.body : _element)?.scrollTo({
      top: _y ?? yRef.current,
      left: _x ?? xRef.current,
      behavior: behaviorRef.current,
    })
    const scrollContainer
      = (_element as Window)?.document?.documentElement
        || (_element as Document)?.documentElement
        || (_element as Element)
    // upstream syncs both backing refs from the actual scroll position after
    // `scrollTo` (its computed refs are always defined, so both branches run)
    xRef.current = scrollContainer.scrollLeft
    yRef.current = scrollContainer.scrollTop
    setXState(xRef.current)
    setYState(yRef.current)
  }, [])

  const measureArrivedState = useCallback((target: UseScrollElement) => {
    const win = windowRef.current
    if (!win)
      return

    const el = (
      (target as Window)?.document?.documentElement
      || (target as Document)?.documentElement
      || target as HTMLElement | SVGElement
    ) as Element

    const { display, flexDirection, direction } = win.getComputedStyle(el)
    const directionMultiplier = direction === 'rtl' ? -1 : 1

    const scrollLeft = el.scrollLeft
    const nextDirections = {
      left: scrollLeft < xRef.current,
      right: scrollLeft > xRef.current,
      top: false,
      bottom: false,
    }

    const offsetLeft = offsetRef.current.left || 0
    const offsetRight = offsetRef.current.right || 0
    const offsetTop = offsetRef.current.top || 0
    const offsetBottom = offsetRef.current.bottom || 0

    const arrivedLeft = Math.abs(scrollLeft * directionMultiplier) <= offsetLeft
    const arrivedRight = Math.abs(scrollLeft * directionMultiplier)
      + el.clientWidth >= el.scrollWidth
      - offsetRight
      - ARRIVED_STATE_THRESHOLD_PIXELS

    const nextArrived = {
      left: arrivedLeft,
      right: arrivedRight,
      top: false,
      bottom: false,
    }
    /**
     * reverse columns and rows behave exactly the other way around, bottom is treated as top and
     * top is treated as the negative version of bottom
     */
    if (display === 'flex' && flexDirection === 'row-reverse') {
      nextArrived.left = arrivedRight
      nextArrived.right = arrivedLeft
    }

    xRef.current = scrollLeft

    let scrollTop = el.scrollTop

    // patch for mobile compatible
    if (target === win.document && !scrollTop)
      scrollTop = win.document.body.scrollTop

    nextDirections.top = scrollTop < yRef.current
    nextDirections.bottom = scrollTop > yRef.current

    const arrivedTop = Math.abs(scrollTop) <= offsetTop
    const arrivedBottom = Math.abs(scrollTop)
      + el.clientHeight >= el.scrollHeight
      - offsetBottom
      - ARRIVED_STATE_THRESHOLD_PIXELS

    if (display === 'flex' && flexDirection === 'column-reverse') {
      nextArrived.top = arrivedBottom
      nextArrived.bottom = arrivedTop
    }
    else {
      nextArrived.top = arrivedTop
      nextArrived.bottom = arrivedBottom
    }

    yRef.current = scrollTop

    setXState(scrollLeft)
    setYState(scrollTop)
    setArrivedState(nextArrived)
    setDirections(nextDirections)
  }, [])

  const onScrollEnd = useCallback((e: Event) => {
    // dedupe if support native scrollend event
    if (!isScrollingRef.current)
      return

    isScrollingRef.current = false
    setIsScrolling(false)
    setDirections({ left: false, right: false, top: false, bottom: false })
    onStopRef.current(e)
  }, [])

  // the shared wrapper is referentially stable and always invokes the latest
  // `onScrollEnd` / `ms`, so the listener registered below never re-binds on
  // renders
  const onScrollEndDebounced = useDebounceFn(onScrollEnd, throttle + idle)

  const onScrollHandler = useCallback((e: Event) => {
    const win = windowRef.current
    if (!win)
      return

    const eventTarget = (
      (e.target as Document).documentElement ?? e.target
    ) as HTMLElement

    measureArrivedState(eventTarget)

    isScrollingRef.current = true
    setIsScrolling(true)
    onScrollEndDebounced(e)
    onScrollRef.current(e)
  }, [measureArrivedState, onScrollEndDebounced])

  const throttledScrollHandler = useThrottleFn(onScrollHandler, throttle, true, false)

  // mirror upstream's registration (`source/vueuse/.../useScroll/index.ts`):
  // attach the raw handler when `throttle` is 0. The shared `useThrottleFn`
  // hook itself cannot be skipped (React hooks must not be conditional), so
  // only the *registered* listener switches — the promise-returning wrapper
  // stays unregistered on the default path.
  const scrollHandler = throttle > 0 ? throttledScrollHandler : onScrollHandler

  // resolve the element during render so the effect below re-binds the
  // listeners whenever the resolved element changes (upstream `useEventListener`
  // watches the element target)
  const trackedElement = element

  useEffect(() => {
    const el = unrefElement(elementRef.current)
    const win = windowRef.current
    if (!win || !el)
      return

    // mirror upstream `tryOnMounted`: measure the initial arrived state
    try {
      measureArrivedState(el)
    }
    catch (e) {
      onErrorRef.current(e)
    }

    const listenerOptions = eventListenerOptionsRef.current
    el.addEventListener('scroll', scrollHandler, listenerOptions)
    el.addEventListener('scrollend', onScrollEnd, listenerOptions)

    let observer: MutationObserver | undefined
    if (observeRef.current?.mutation && el !== win && el !== win.document) {
      observer = new MutationObserver(() => {
        const _element = unrefElement(elementRef.current)
        if (_element)
          measureArrivedState(_element)
      })
      observer.observe(el as Element, {
        attributes: true,
        childList: true,
        subtree: true,
      })
    }

    return () => {
      el.removeEventListener('scroll', scrollHandler, listenerOptions)
      el.removeEventListener('scrollend', onScrollEnd, listenerOptions)
      observer?.disconnect()
    }
  }, [trackedElement, scrollHandler, onScrollEnd, measureArrivedState])

  const measure = useCallback(() => {
    const _element = unrefElement(elementRef.current)
    if (windowRef.current && _element)
      measureArrivedState(_element)
  }, [measureArrivedState])

  const setX = useCallback((value: number) => {
    scrollTo(value, undefined)
  }, [scrollTo])

  const setY = useCallback((value: number) => {
    scrollTo(undefined, value)
  }, [scrollTo])

  return {
    x,
    y,
    isScrolling,
    arrivedState,
    directions,
    measure,
    setX,
    setY,
  }
}
