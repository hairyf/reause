import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * We have to check if the scroll amount is close enough to some threshold in order to more
 * accurately calculate arrivedState. This is because scrollTop/scrollLeft are non-rounded numbers,
 * while scrollHeight/scrollWidth and clientHeight/clientWidth are rounded.
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#determine_if_an_element_has_been_totally_scrolled
 */
const ARRIVED_STATE_THRESHOLD_PIXELS = 1

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
 * Resolve the `window` to work against: an explicitly provided option wins, otherwise the global
 * `window` on the client (`undefined` on the server).
 */
function resolveWindow(custom?: Window): Window | undefined {
  return custom ?? (typeof window === 'undefined' ? undefined : window)
}

/**
 * Reactive window scroll.
 *
 * Map from @vueuse/core `useWindowScroll`
 * (`source/vueuse/packages/core/useWindowScroll/`), which delegates to
 * upstream `useScroll(window)`: reactive `x` / `y` scroll position, `isScrolling` with an `idle`
 * timeout, `arrivedState` within `offset` pixels of the edges and per-axis `directions`.
 *
 * 1. Refs → plain state values: upstream returns a writable `computed` for `x` / `y` and
 * `ShallowRef` / `reactive` objects for the rest; here every value is React state that updates on
 * re-render. Scroll events are batched by React, so all values settle together. 2. Writable refs →
 * setter functions: scroll with the `setX` / `setY` callbacks instead of assigning `x.value`; both
 * are stable (`useCallback`) and call `window.scrollTo` honoring the `behavior` option. 3. The
 * `scroll` / `scrollend` listeners (passive, non-capturing per upstream's `eventListenerOptions`
 * default) are registered inline in a `useEffect` with cleanup; the idle reset is a plain
 * `setTimeout` instead of upstream's `useDebounceFn`, and the `throttle` option is a small trailing
 * throttle (upstream `useThrottleFn(..., { trailing: true, leading: false })`). 4. The `observe`
 * option is accepted for signature parity but inert: upstream never registers the MutationObserver
 * when the target is the window.
 *
 * @example
 * const { x, y, isScrolling, arrivedState, directions, measure, setX, setY } = useWindowScroll()
 * setY(y + 200) // scroll down 200px more
 */
export function useWindowScroll(options: UseWindowScrollOptions = {}): UseWindowScrollReturn {
  const {
    window: configurableWindow,
    throttle = 0,
    idle = 200,
    offset,
    onScroll,
    onStop,
    eventListenerOptions = { capture: false, passive: true },
    behavior = 'auto',
    onError = (e) => { console.error(e) },
  } = options

  const offsetLeft = offset?.left ?? 0
  const offsetRight = offset?.right ?? 0
  const offsetTop = offset?.top ?? 0
  const offsetBottom = offset?.bottom ?? 0

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

  // latest-value refs synced each render so the scroll handler, the setters
  // and the effect below always read the newest options without resubscribing
  const internalXRef = useRef(0)
  const internalYRef = useRef(0)
  const isScrollingRef = useRef(false)
  const behaviorRef = useRef(behavior)
  const idleRef = useRef(idle)
  const throttleRef = useRef(throttle)
  const onErrorRef = useRef(onError)
  const onScrollRef = useRef(onScroll)
  const onStopRef = useRef(onStop)
  const eventListenerOptionsRef = useRef(eventListenerOptions)
  const offsetRef = useRef({ left: offsetLeft, right: offsetRight, top: offsetTop, bottom: offsetBottom })
  const winRef = useRef<Window | undefined>(undefined)
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingThrottleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastScrollRef = useRef(0)

  behaviorRef.current = behavior
  idleRef.current = idle
  throttleRef.current = throttle
  onErrorRef.current = onError
  onScrollRef.current = onScroll
  onStopRef.current = onStop
  eventListenerOptionsRef.current = eventListenerOptions
  offsetRef.current = { left: offsetLeft, right: offsetRight, top: offsetTop, bottom: offsetBottom }

  const measure = useCallback(() => {
    const win = winRef.current
    if (!win)
      return

    const el = win.document.documentElement
    const { display, flexDirection, direction } = win.getComputedStyle(el)
    const directionMultiplier = direction === 'rtl' ? -1 : 1

    const scrollLeft = el.scrollLeft
    let scrollTop = el.scrollTop

    // patch for mobile compatible
    if (!scrollTop)
      scrollTop = win.document.body.scrollTop

    const nextDirections = {
      left: scrollLeft < internalXRef.current,
      right: scrollLeft > internalXRef.current,
      top: scrollTop < internalYRef.current,
      bottom: scrollTop > internalYRef.current,
    }

    const arrivedLeft = Math.abs(scrollLeft * directionMultiplier) <= offsetRef.current.left
    const arrivedRight = Math.abs(scrollLeft * directionMultiplier)
      + el.clientWidth >= el.scrollWidth - offsetRef.current.right - ARRIVED_STATE_THRESHOLD_PIXELS
    const arrivedTop = Math.abs(scrollTop) <= offsetRef.current.top
    const arrivedBottom = Math.abs(scrollTop)
      + el.clientHeight >= el.scrollHeight - offsetRef.current.bottom - ARRIVED_STATE_THRESHOLD_PIXELS

    /**
     * reverse columns and rows behave exactly the other way around, bottom is treated as top and
     * top is treated as the negative version of bottom
     */
    const rowReversed = display === 'flex' && flexDirection === 'row-reverse'
    const columnReversed = display === 'flex' && flexDirection === 'column-reverse'

    setArrivedState({
      left: rowReversed ? arrivedRight : arrivedLeft,
      right: rowReversed ? arrivedLeft : arrivedRight,
      top: columnReversed ? arrivedBottom : arrivedTop,
      bottom: columnReversed ? arrivedTop : arrivedBottom,
    })
    setDirections(nextDirections)

    internalXRef.current = scrollLeft
    internalYRef.current = scrollTop
    setXState(scrollLeft)
    setYState(scrollTop)
  }, [])

  const onScrollEnd = useCallback((e: Event) => {
    // dedupe if support native scrollend event
    if (!isScrollingRef.current)
      return

    isScrollingRef.current = false
    setIsScrolling(false)
    setDirections({ left: false, right: false, top: false, bottom: false })
    onStopRef.current?.(e)
  }, [])

  const setX = useCallback((value: number) => {
    const win = winRef.current
    if (!win)
      return
    win.scrollTo({ left: value, top: internalYRef.current, behavior: behaviorRef.current })
  }, [])

  const setY = useCallback((value: number) => {
    const win = winRef.current
    if (!win)
      return
    win.scrollTo({ left: internalXRef.current, top: value, behavior: behaviorRef.current })
  }, [])

  useEffect(() => {
    const win = resolveWindow(configurableWindow)
    winRef.current = win
    if (!win)
      return

    // mirror upstream `tryOnMounted`: measure the initial arrived state
    try {
      measure()
    }
    catch (e) {
      onErrorRef.current(e)
    }

    const handleScroll = (e: Event) => {
      measure()
      isScrollingRef.current = true
      setIsScrolling(true)
      clearTimeout(scrollEndTimerRef.current)
      // upstream: `useDebounceFn(onScrollEnd, throttle + idle)`
      scrollEndTimerRef.current = setTimeout(
        onScrollEnd,
        (throttleRef.current || 0) + idleRef.current,
        e,
      )
      onScrollRef.current?.(e)
    }

    // upstream: `useThrottleFn(onScrollHandler, throttle, true, false)` —
    // leading fires immediately (first call always exceeds the window),
    // trailing fires once at the end of a throttled window
    const onScroll = (e: Event) => {
      const ms = throttleRef.current
      const now = Date.now()
      clearTimeout(pendingThrottleTimerRef.current)
      if (ms <= 0 || now - lastScrollRef.current >= ms) {
        lastScrollRef.current = now
        handleScroll(e)
      }
      else {
        pendingThrottleTimerRef.current = setTimeout(() => {
          lastScrollRef.current = Date.now()
          handleScroll(e)
        }, ms - (now - lastScrollRef.current))
      }
    }

    const listenerOptions = eventListenerOptionsRef.current
    win.addEventListener('scroll', onScroll, listenerOptions)
    win.addEventListener('scrollend', onScrollEnd, listenerOptions)

    return () => {
      win.removeEventListener('scroll', onScroll, listenerOptions)
      win.removeEventListener('scrollend', onScrollEnd, listenerOptions)
      clearTimeout(scrollEndTimerRef.current)
      clearTimeout(pendingThrottleTimerRef.current)
    }
  }, [measure, onScrollEnd, configurableWindow])

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
