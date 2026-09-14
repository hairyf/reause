import type { RefObject } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { unrefElement } from '../unrefElement'
import { useEventListener } from '../useEventListener'

const DEFAULT_DELAY = 500
const DEFAULT_THRESHOLD = 10

export interface UseLongPressModifiers {
  /**
   * Calls `event.stopPropagation()` on the pointer events.
   *
   * @default undefined
   */
  stop?: boolean
  /**
   * Removes the event listener after the first trigger.
   *
   * @default undefined
   */
  once?: boolean
  /**
   * Calls `event.preventDefault()` on the pointer events.
   *
   * @default undefined
   */
  prevent?: boolean
  /**
   * Uses capture mode for the event listener.
   *
   * @default undefined
   */
  capture?: boolean
  /**
   * Only triggers if the event target is the element itself.
   *
   * @default undefined
   */
  self?: boolean
}

export interface UseLongPressOptions {
  /**
   * Time in ms till `longpress` gets called
   *
   * @default 500
   */
  delay?: number | ((ev: PointerEvent) => number)

  modifiers?: UseLongPressModifiers

  /**
   * Allowance of moving distance in pixels, the action will get canceled when moving too far from
   * the pointerdown position.
   *
   * @default 10
   */
  distanceThreshold?: number | false

  /**
   * Function called when the ref element is released.
   *
   * @param duration how long the element was pressed in ms
   * @param distance distance from the pointerdown position
   * @param isLongPress whether the action was a long press or not
   * @param pointerEvent the native {@link PointerEvent} triggered by the browser
   */
  onMouseUp?: (duration: number, distance: number, isLongPress: boolean, pointerEvent: PointerEvent) => void
}

export type UseLongPressReturn = () => void

/**
 * Map from @vueuse/core `onLongPress`
 * (`source/vueuse/packages/core/onLongPress/`).
 *
 * @see https://vueuse.org/core/onLongPress/
 *
 * @example
 * const target = useRef<HTMLButtonElement | null>(null)
 * const [longPressed, setLongPressed] = useState(false)
 *
 * useLongPress(target, () => {
 *   setLongPressed(true)
 * })
 *
 * const stop = useLongPress(target, handler, { delay: 1000 })
 * stop()
 */
export function useLongPress(
  target: RefObject<EventTarget | null | undefined>,
  handler: (evt: PointerEvent) => void,
  options: UseLongPressOptions = {},
): UseLongPressReturn {
  const { delay, distanceThreshold = DEFAULT_THRESHOLD, modifiers, onMouseUp } = options

  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const posStart = useRef<{ x: number, y: number } | null>(null)
  const startTimestamp = useRef<number | null>(null)
  const hasLongPressed = useRef(false)

  // latest-value ref so listeners bound once still read the newest callbacks
  // and options without re-subscribing on every render
  const latest = useRef({ target, handler, delay, distanceThreshold, modifiers, onMouseUp })
  latest.current = { target, handler, delay, distanceThreshold, modifiers, onMouseUp }

  const clear = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current)
      timeout.current = null
    }
    posStart.current = null
    startTimestamp.current = null
    hasLongPressed.current = false
  }, [])

  function onDown(evt: PointerEvent) {
    const {
      target: pressTarget,
      handler: pressHandler,
      delay: pressDelay,
      modifiers: pressModifiers,
    } = latest.current

    if (pressModifiers?.self && evt.target !== (pressTarget ? unrefElement(pressTarget) : undefined))
      return

    clear()

    if (pressModifiers?.prevent)
      evt.preventDefault()

    if (pressModifiers?.stop)
      evt.stopPropagation()

    posStart.current = { x: evt.x, y: evt.y }
    startTimestamp.current = evt.timeStamp

    const timer = setTimeout(
      () => {
        timeout.current = null
        hasLongPressed.current = true
        pressHandler(evt)
      },
      typeof pressDelay === 'function' ? pressDelay(evt) : pressDelay ?? DEFAULT_DELAY,
    )
    timeout.current = timer
  }

  function onMove(evt: PointerEvent) {
    const {
      target: moveTarget,
      distanceThreshold: moveThreshold,
      modifiers: moveModifiers,
    } = latest.current

    if (moveModifiers?.self && evt.target !== (moveTarget ? unrefElement(moveTarget) : undefined))
      return

    if (!posStart.current || moveThreshold === false)
      return

    if (moveModifiers?.prevent)
      evt.preventDefault()

    if (moveModifiers?.stop)
      evt.stopPropagation()

    const dx = evt.x - posStart.current.x
    const dy = evt.y - posStart.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance >= moveThreshold)
      clear()
  }

  function onRelease(evt: PointerEvent) {
    const {
      target: releaseTarget,
      modifiers: releaseModifiers,
      onMouseUp: releaseMouseUp,
    } = latest.current

    const [releasePosStart, releaseStartTimestamp, releaseHasLongPressed] = [
      posStart.current,
      startTimestamp.current,
      hasLongPressed.current,
    ]
    clear()

    if (!releaseMouseUp || !releasePosStart || !releaseStartTimestamp)
      return

    if (releaseModifiers?.self && evt.target !== (releaseTarget ? unrefElement(releaseTarget) : undefined))
      return

    if (releaseModifiers?.prevent)
      evt.preventDefault()

    if (releaseModifiers?.stop)
      evt.stopPropagation()

    const dx = evt.x - releasePosStart.x
    const dy = evt.y - releasePosStart.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    releaseMouseUp(evt.timeStamp - releaseStartTimestamp, distance, releaseHasLongPressed, evt)
  }

  const listenerOptions: AddEventListenerOptions = {
    capture: modifiers?.capture,
    once: modifiers?.once,
  }

  const stopPointerDown = useEventListener(target, 'pointerdown', onDown, listenerOptions)
  const stopPointerMove = useEventListener(target, 'pointermove', onMove, listenerOptions)
  const stopPointerRelease = useEventListener(target, ['pointerup', 'pointerleave', 'pointercancel'], onRelease, listenerOptions)

  // clear any in-flight long-press timer on unmount
  useEffect(() => () => clear(), [clear])

  const stop = useCallback(() => {
    clear()
    stopPointerDown?.()
    stopPointerMove?.()
    stopPointerRelease?.()
  }, [clear, stopPointerDown, stopPointerMove, stopPointerRelease])

  return stop
}
