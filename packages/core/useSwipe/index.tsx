import type { ConfigurableWindow } from '@reause/shared'
import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

export type UseSwipeDirection = 'up' | 'down' | 'left' | 'right' | 'none'

interface Position {
  x: number
  y: number
}

export interface UseSwipeOptions extends ConfigurableWindow {
  /**
   * Register events as passive
   *
   * @default true
   */
  passive?: boolean

  /**
   * @default 50
   */
  threshold?: number

  /**
   * Callback on swipe start
   */
  onSwipeStart?: (e: TouchEvent) => void

  /**
   * Callback on swipe moves
   */
  onSwipe?: (e: TouchEvent) => void

  /**
   * Callback on swipe ends
   */
  onSwipeEnd?: (e: TouchEvent, direction: UseSwipeDirection) => void
}

export interface UseSwipeReturn {
  isSwiping: boolean
  direction: UseSwipeDirection
  coordsStart: Readonly<Position>
  coordsEnd: Readonly<Position>
  lengthX: number
  lengthY: number
  stop: () => void
}

function resolveSwipeTarget(
  target: RefObject<EventTarget | null | undefined>,
): EventTarget | null | undefined {
  return target ? unrefElement(target) : undefined
}

function getSwipeDirection(start: Position, end: Position, threshold: number): UseSwipeDirection {
  const diffX = start.x - end.x
  const diffY = start.y - end.y
  const isThresholdExceeded = Math.max(Math.abs(diffX), Math.abs(diffY)) >= threshold

  if (!isThresholdExceeded)
    return 'none'

  if (Math.abs(diffX) > Math.abs(diffY))
    return diffX > 0 ? 'left' : 'right'

  return diffY > 0 ? 'up' : 'down'
}

/**
 * Map from @vueuse/core `useSwipe`.
 *
 * @param target - React ref object (`RefObject`) holding the event target to
 *   listen on, resolved with the shared `unrefElement`
 * @param options - `passive` (default `true`), `threshold` (default `50`) and
 *   the `onSwipeStart` / `onSwipe` / `onSwipeEnd` callbacks
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const { isSwiping, direction, lengthX, lengthY } = useSwipe(el, {
 *   threshold: 50,
 *   onSwipeEnd: (e, direction) => console.log(direction),
 * })
 */
export function useSwipe(
  target: RefObject<EventTarget | null | undefined>,
  options: UseSwipeOptions = {},
): UseSwipeReturn {
  const { threshold = 50, passive = true } = options

  // latest-value refs synced each render so the listeners registered in the
  // bind effect always read the newest options (stable handler identities)
  const targetRef = useRef(target)
  const optionsRef = useRef(options)
  targetRef.current = target
  optionsRef.current = options

  // coords + isSwiping live in refs for the synchronous event-time math (the
  // preventDefault decision and the direction passed to onSwipeEnd) and in
  // state for rendering
  const [coords, setCoords] = useState<{ start: Position, end: Position }>({
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
  })
  const coordsRef = useRef(coords)
  const [isSwiping, setIsSwiping] = useState(false)
  const isSwipingRef = useRef(false)
  const stoppedRef = useRef(false)
  const detachRef = useRef<(() => void) | null>(null)

  // The element the listeners are bound to. The ref is resolved during render;
  // the ref's `.current` is re-read after every commit, because React writes
  // `ref.current` in the commit phase — after the render that mounted the
  // element — so a ref that was still `null` while rendering must still
  // re-bind once the element exists.
  const [bindTarget, setBindTarget] = useState<EventTarget | null>(
    () => resolveSwipeTarget(target) ?? null,
  )
  const bindTargetRef = useRef(bindTarget)
  bindTargetRef.current = bindTarget

  useEffect(() => {
    if (stoppedRef.current)
      return
    const el = resolveSwipeTarget(targetRef.current) ?? null
    if (bindTargetRef.current !== el) {
      bindTargetRef.current = el
      setBindTarget(el)
    }
  })

  const stop = useCallback(() => {
    stoppedRef.current = true
    detachRef.current?.()
    detachRef.current = null
  }, [])

  useEffect(() => {
    if (stoppedRef.current || !bindTarget)
      return

    const el = bindTarget
    const listenerOptions = { passive, capture: !passive }

    const getTouchEventCoords = (e: TouchEvent): [number, number] =>
      [e.touches[0].clientX, e.touches[0].clientY]

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1)
        return
      const [x, y] = getTouchEventCoords(e)
      coordsRef.current = { start: { x, y }, end: { x, y } }
      setCoords(coordsRef.current)
      optionsRef.current.onSwipeStart?.(e)
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1)
        return
      const [x, y] = getTouchEventCoords(e)
      const { start } = coordsRef.current
      coordsRef.current = { start, end: { x, y } }
      setCoords(coordsRef.current)

      const { onSwipe, threshold: moveThreshold = 50 } = optionsRef.current
      const diffX = start.x - x
      const diffY = start.y - y

      if (listenerOptions.capture && !listenerOptions.passive && Math.abs(diffX) > Math.abs(diffY))
        e.preventDefault()

      const isThresholdExceeded = Math.max(Math.abs(diffX), Math.abs(diffY)) >= moveThreshold
      if (!isSwipingRef.current && isThresholdExceeded) {
        isSwipingRef.current = true
        setIsSwiping(true)
      }
      if (isSwipingRef.current)
        onSwipe?.(e)
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (isSwipingRef.current) {
        const { start, end } = coordsRef.current
        const { onSwipeEnd, threshold: endThreshold = 50 } = optionsRef.current
        onSwipeEnd?.(e, getSwipeDirection(start, end, endThreshold))
      }

      isSwipingRef.current = false
      setIsSwiping(false)
    }

    el.addEventListener('touchstart', onTouchStart as EventListener, listenerOptions)
    el.addEventListener('touchmove', onTouchMove as EventListener, listenerOptions)
    el.addEventListener('touchend', onTouchEnd as EventListener, listenerOptions)
    el.addEventListener('touchcancel', onTouchEnd as EventListener, listenerOptions)

    const detach = () => {
      el.removeEventListener('touchstart', onTouchStart as EventListener, listenerOptions)
      el.removeEventListener('touchmove', onTouchMove as EventListener, listenerOptions)
      el.removeEventListener('touchend', onTouchEnd as EventListener, listenerOptions)
      el.removeEventListener('touchcancel', onTouchEnd as EventListener, listenerOptions)
      detachRef.current = null
    }
    detachRef.current = detach

    return detach
  }, [bindTarget, passive])

  const { start, end } = coords

  return {
    isSwiping,
    direction: getSwipeDirection(start, end, threshold),
    coordsStart: start,
    coordsEnd: end,
    lengthX: start.x - end.x,
    lengthY: start.y - end.y,
    stop,
  }
}
