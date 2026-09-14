import type { ConfigurableWindow, EventFilter } from '@reause/shared'
import { throttleFilter, timestamp } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

const defaultEvents: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']
const oneMinute = 60_000

export interface UseIdleOptions extends ConfigurableWindow {
  /**
   * Event names that listen to for detected user activity
   *
   * @default ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']
   */
  events?: (keyof WindowEventMap)[]
  /**
   * Listen for document visibility change
   *
   * @default true
   */
  listenForVisibilityChange?: boolean
  /**
   * Initial state of the idle value
   *
   * @default false
   */
  initialState?: boolean
  /**
   * Filter for if events should to be received.
   *
   * @default throttleFilter(50)
   */
  eventFilter?: EventFilter
}

export interface UseIdleReturn {
  idle: boolean
  lastActive: number
  isPending: boolean
  reset: () => void
  stop: () => void
  start: () => void
}

/**
 * React port of VueUse's `useIdle` — tracks whether the user is being inactive.
 *
 * Map from @vueuse/core `useIdle`
 * (`source/vueuse/packages/core/useIdle/`). Returns an object mirroring the
 * upstream members: `{ idle, lastActive, isPending, reset, stop, start }`. `idle` is a plain
 * boolean state (user inactive), `lastActive` the timestamp of the latest activity, and `reset`
 * restarts the idle timer (without touching `lastActive`). Every activity event (default:
 * `mousemove`/`mousedown`/`resize`/`keydown`/`touchstart`/`wheel` on the window, plus document
 * `visibilitychange`) refreshes `lastActive` and restarts the timer — after `timeout` ms without
 * activity `idle` flips to `true`.
 *
 * React divergences:
 * - upstream's `useEventListener` + `createFilterWrapper` become a
 *   self-contained mount `useEffect` that registers the listeners (passive)
 *   and removes them on unmount, with each event flowing through the 50ms
 *   `throttleFilter` (options are evaluated once, like upstream's setup);
 * - the idle timer is a `setTimeout` held in a ref and cleared on unmount;
 *   there is no window access during render, so SSR renders the defaults
 *   without starting anything.
 *
 * @example
 * const { idle, lastActive, reset } = useIdle(5 * 60 * 1000) // 5 min
 */
export function useIdle(timeout: number = oneMinute, options: UseIdleOptions = {}): UseIdleReturn {
  const {
    initialState = false,
    listenForVisibilityChange = true,
    events = defaultEvents,
    window: customWindow,
    eventFilter = throttleFilter(50),
  } = options

  const [idle, setIdle] = useState(initialState)
  const [lastActive, setLastActive] = useState(timestamp)
  const [isPending, setIsPending] = useState(false)

  const win = customWindow ?? (typeof window === 'undefined' ? undefined : window)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPendingRef = useRef(isPending)

  // the options are evaluated once during setup (upstream reads them once in
  // setup), so the filter instance and the listener configuration stay stable
  // across renders
  const filterRef = useRef(eventFilter)
  const eventsRef = useRef(events)
  const listenForVisibilityChangeRef = useRef(listenForVisibilityChange)

  const reset = useCallback(() => {
    setIdle(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    timerRef.current = setTimeout(setIdle, timeout, true)
  }, [timeout])

  const onEvent = useCallback(() => {
    // upstream guards the wrapped callback (`if (!isPending.value) return`)
    // so activity flowing in after `stop()` cannot refresh `lastActive` or
    // re-arm the idle timer
    if (!isPendingRef.current)
      return
    setLastActive(timestamp())
    reset()
  }, [reset])
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const start = useCallback(() => {
    if (isPendingRef.current)
      return
    isPendingRef.current = true
    setIsPending(true)
    if (!initialState)
      reset()
  }, [initialState, reset])

  const stop = useCallback(() => {
    setIdle(initialState)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    isPendingRef.current = false
    setIsPending(false)
  }, [initialState])

  // register the activity listeners once (upstream: `useEventListener` in
  // setup); each event flows through the captured event filter
  useEffect(() => {
    if (!win)
      return

    const listenerOptions = { passive: true }
    const handleEvent = () => filterRef.current(() => onEventRef.current())
    const handleVisibilityChange = () => {
      if (win.document.hidden || !isPendingRef.current)
        return
      handleEvent()
    }

    for (const event of eventsRef.current)
      win.addEventListener(event, handleEvent, listenerOptions)
    if (listenForVisibilityChangeRef.current)
      win.document.addEventListener('visibilitychange', handleVisibilityChange, listenerOptions)

    return () => {
      for (const event of eventsRef.current)
        win.removeEventListener(event, handleEvent)
      win.document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [win])

  // start tracking on mount (upstream calls `start()` at the end of setup);
  // a re-run is a no-op while pending, so changing options just re-applies
  // the same start behavior
  useEffect(() => {
    if (!win)
      return
    start()
  }, [win, start])

  // clear a pending timer when the component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return { idle, lastActive, isPending, reset, stop, start }
}
