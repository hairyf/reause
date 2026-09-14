import type { RefObject } from 'react'
import type { PointerType } from '../usePointer'
import type { UseSwipeDirection } from '../useSwipe'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

interface Position {
  x: number
  y: number
}

export interface UsePointerSwipeOptions {
  /**
   * @default 50
   */
  threshold?: number

  /**
   * Callback on swipe start.
   */
  onSwipeStart?: (e: PointerEvent) => void

  /**
   * Callback on swipe move.
   */
  onSwipe?: (e: PointerEvent) => void

  /**
   * Callback on swipe end.
   */
  onSwipeEnd?: (e: PointerEvent, direction: UseSwipeDirection) => void

  /**
   * Pointer types to listen to.
   *
   * @default ['mouse', 'touch', 'pen']
   */
  pointerTypes?: PointerType[]

  /**
   * Disable text selection on swipe.
   *
   * @default false
   */
  disableTextSelect?: boolean
}

export interface UsePointerSwipeReturn {
  readonly isSwiping: boolean
  readonly direction: UseSwipeDirection
  readonly posStart: Readonly<Position>
  readonly posEnd: Readonly<Position>
  readonly distanceX: number
  readonly distanceY: number
  stop: () => void
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
 * Map from @vueuse/core `usePointerSwipe`
 * (`source/vueuse/packages/core/usePointerSwipe/`).
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   listen on, resolved with the shared `unrefElement`
 * @param options - `threshold` (default `50`), `pointerTypes` (default
 *   `['mouse', 'touch', 'pen']`), `disableTextSelect` (default `false`) and
 *   the `onSwipeStart` / `onSwipe` / `onSwipeEnd` callbacks
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const { isSwiping, direction } = usePointerSwipe(el, {
 *   threshold: 50,
 *   onSwipeEnd: (e, direction) => console.log(direction),
 * })
 */
export function usePointerSwipe(
  target: RefObject<HTMLElement | null | undefined>,
  options: UsePointerSwipeOptions = {},
): UsePointerSwipeReturn {
  const { threshold = 50, disableTextSelect = false } = options

  // latest-value refs synced each render so the listeners registered in the
  // mount effect always read the newest options (stable handler identities)
  const targetRef = useRef(target)
  const optionsRef = useRef(options)
  targetRef.current = target
  optionsRef.current = options

  // coords + isSwiping live in refs for the synchronous event-time math (the
  // threshold/direction decision passed to onSwipeEnd) and in state for
  // rendering
  const [posStart, setPosStart] = useState<Position>({ x: 0, y: 0 })
  const posStartRef = useRef(posStart)
  const [posEnd, setPosEnd] = useState<Position>({ x: 0, y: 0 })
  const posEndRef = useRef(posEnd)
  const [isSwiping, setIsSwiping] = useState(false)
  const isSwipingRef = useRef(false)
  const isPointerDownRef = useRef(false)
  const stoppedRef = useRef(false)
  const detachRef = useRef<(() => void) | null>(null)

  // dependency-tracking read: refs populate before effects run, so the first
  // render reports `null` for the ref's `.current` — the effect below re-resolves
  // fresh and re-binds whenever the resolved element changes
  const trackedTarget = target

  const stop = useCallback(() => {
    stoppedRef.current = true
    detachRef.current?.()
    detachRef.current = null
  }, [])

  useEffect(() => {
    if (stoppedRef.current)
      return

    const el = unrefElement(targetRef.current)
    if (!el)
      return

    const listenerOptions: AddEventListenerOptions = { passive: true }

    const eventIsAllowed = (e: PointerEvent): boolean => {
      const isReleasingButton = e.buttons === 0
      const isPrimaryButton = e.buttons === 1
      const { pointerTypes } = optionsRef.current
      return pointerTypes?.includes(e.pointerType as PointerType) ?? (isReleasingButton || isPrimaryButton) ?? true
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!eventIsAllowed(e))
        return
      isPointerDownRef.current = true
      // Future pointer events will be retargeted to target until pointerup/cancel
      const eventTarget = e.target as HTMLElement | undefined
      eventTarget?.setPointerCapture(e.pointerId)
      const { clientX: x, clientY: y } = e
      posStartRef.current = { x, y }
      posEndRef.current = { x, y }
      setPosStart(posStartRef.current)
      setPosEnd(posEndRef.current)
      optionsRef.current.onSwipeStart?.(e)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!eventIsAllowed(e))
        return
      if (!isPointerDownRef.current)
        return

      const { clientX: x, clientY: y } = e
      const { x: startX, y: startY } = posStartRef.current
      posEndRef.current = { x, y }
      setPosEnd(posEndRef.current)

      const { onSwipe } = optionsRef.current
      const diffX = startX - posEndRef.current.x
      const diffY = startY - posEndRef.current.y
      const isThresholdExceeded = Math.max(Math.abs(diffX), Math.abs(diffY)) >= threshold

      if (!isSwipingRef.current && isThresholdExceeded) {
        isSwipingRef.current = true
        setIsSwiping(true)
      }
      if (isSwipingRef.current)
        onSwipe?.(e)
    }

    const onPointerEnd = (e: PointerEvent) => {
      if (!eventIsAllowed(e))
        return
      if (isSwipingRef.current) {
        const { onSwipeEnd } = optionsRef.current
        onSwipeEnd?.(e, getSwipeDirection(posStartRef.current, posEndRef.current, threshold))
      }

      isPointerDownRef.current = false
      isSwipingRef.current = false
      setIsSwiping(false)
    }

    el.addEventListener('pointerdown', onPointerDown, listenerOptions)
    el.addEventListener('pointermove', onPointerMove, listenerOptions)
    el.addEventListener('pointerup', onPointerEnd, listenerOptions)
    el.addEventListener('pointercancel', onPointerEnd, listenerOptions)

    // Allow vertical scrolling, disable horizontal scrolling by touch
    el.style.setProperty('touch-action', 'pan-y')

    if (disableTextSelect) {
      // Disable text selection on swipe
      el.style.setProperty('-webkit-user-select', 'none')
      el.style.setProperty('-ms-user-select', 'none')
      el.style.setProperty('user-select', 'none')
    }

    const detach = () => {
      el.removeEventListener('pointerdown', onPointerDown, listenerOptions)
      el.removeEventListener('pointermove', onPointerMove, listenerOptions)
      el.removeEventListener('pointerup', onPointerEnd, listenerOptions)
      el.removeEventListener('pointercancel', onPointerEnd, listenerOptions)
      detachRef.current = null
    }
    detachRef.current = detach

    return detach
  }, [trackedTarget, disableTextSelect, threshold])

  const distanceX = posStart.x - posEnd.x
  const distanceY = posStart.y - posEnd.y

  return {
    isSwiping,
    direction: getSwipeDirection(posStart, posEnd, threshold),
    posStart,
    posEnd,
    distanceX,
    distanceY,
    stop,
  }
}
