import type { RefObject } from 'react'
import type { PointerType } from '../usePointer'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

export interface Position {
  x: number
  y: number
}

export type DraggableTarget = RefObject<HTMLElement | SVGElement | null | undefined>

export type DraggableElement = RefObject<HTMLElement | SVGElement | Window | Document | null | undefined>

export type DraggableContainer = RefObject<HTMLElement | SVGElement | null | undefined>

export interface UseDraggableOptions {
  /**
   * Only start the dragging when click on the element directly
   *
   * @default false
   */
  exact?: boolean

  /**
   * Prevent events defaults
   *
   * @default false
   */
  preventDefault?: boolean

  /**
   * Prevent events propagation
   *
   * @default false
   */
  stopPropagation?: boolean

  /**
   * Whether dispatch events in capturing phase
   *
   * @default true
   */
  capture?: boolean

  /**
   * Element to attach `pointermove` and `pointerup` events to.
   *
   * @default window
   */
  draggingElement?: DraggableElement

  /**
   * Element for calculating bounds (If not set, it will use the event's target).
   *
   * @default undefined
   */
  containerElement?: DraggableContainer

  /**
   * Handle that triggers the drag event
   *
   * @default target
   */
  handle?: DraggableTarget

  /**
   * Pointer types that listen to.
   *
   * @default ['mouse', 'touch', 'pen']
   */
  pointerTypes?: PointerType[]

  /**
   * Initial position of the element.
   *
   * @default { x: 0, y: 0 }
   */
  initialValue?: Position

  /**
   * Callback when the dragging starts. Return `false` to prevent dragging.
   */
  onStart?: (position: Position, event: PointerEvent) => void | false

  /**
   * Callback during dragging.
   */
  onMove?: (position: Position, event: PointerEvent) => void

  /**
   * Callback when dragging end.
   */
  onEnd?: (position: Position, event: PointerEvent) => void

  /**
   * Axis to drag on.
   *
   * @default 'both'
   */
  axis?: 'x' | 'y' | 'both'

  /**
   * Disabled drag and drop.
   *
   * @default false
   */
  disabled?: boolean

  /**
   * Mouse buttons that are allowed to trigger drag events.
   *
   * - `0`: Main button, usually the left button or the un-initialized state
   * - `1`: Auxiliary button, usually the wheel button or the middle button (if present)
   * - `2`: Secondary button, usually the right button
   * - `3`: Fourth button, typically the Browser Back button
   * - `4`: Fifth button, typically the Browser Forward button
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button#value
   * @default [0]
   */
  buttons?: number[]

  /**
   * Whether to restrict dragging within the visible area of the container.
   *
   * If enabled, the draggable element will not leave the visible area of its container, ensuring it
   * remains within the viewport of the container during the drag.
   *
   * @default false
   */
  restrictInView?: boolean

  /**
   * Whether to enable auto-scroll when dragging near the edges.
   *
   * @default false
   */
  autoScroll?: boolean | {
    /**
     * Speed of auto-scroll.
     *
     * @default 2
     */
    speed?: number | Position

    /**
     * Margin from the edge to trigger auto-scroll.
     *
     * @default 30
     */
    margin?: number | Position

    /**
     * Direction of auto-scroll.
     *
     * @default 'both'
     */
    direction?: 'x' | 'y' | 'both'
  }
}

export interface UseDraggableReturn {
  x: number
  y: number
  position: Position
  isDragging: boolean
  style: string
  /**
   * Set the x position — the React equivalent of assigning upstream's writable `x` ref. Updates the
   * returned `x`, `position` and `style` together with the internal drag position.
   */
  setX: (value: number) => void
  /**
   * Set the y position — the React equivalent of assigning upstream's writable `y` ref. Updates the
   * returned `y`, `position` and `style` together with the internal drag position.
   */
  setY: (value: number) => void
}

interface ScrollSettings {
  speed: number | Position
  margin: number | Position
  direction: 'x' | 'y' | 'both'
}

const defaultScrollConfig = { speed: 2, margin: 30, direction: 'both' } as const

function clampContainerScroll(container: HTMLElement) {
  if (container.scrollLeft > container.scrollWidth - container.clientWidth)
    container.scrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
  if (container.scrollTop > container.scrollHeight - container.clientHeight)
    container.scrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
}

function getScrollAxisValues(value: number | Position): [number, number] {
  return typeof value === 'number' ? [value, value] : [value.x, value.y]
}

function handleAutoScroll(
  container: HTMLElement | SVGElement,
  targetRect: DOMRect,
  position: Position,
  settings: ScrollSettings,
) {
  const { clientWidth, clientHeight, scrollLeft, scrollTop, scrollWidth, scrollHeight } = container

  const [marginX, marginY] = getScrollAxisValues(settings.margin)
  const [speedX, speedY] = getScrollAxisValues(settings.speed)

  let deltaX = 0
  let deltaY = 0

  if (settings.direction === 'x' || settings.direction === 'both') {
    if (position.x < marginX && scrollLeft > 0)
      deltaX = -speedX
    else if (position.x + targetRect.width > clientWidth - marginX && scrollLeft < scrollWidth - clientWidth)
      deltaX = speedX
  }

  if (settings.direction === 'y' || settings.direction === 'both') {
    if (position.y < marginY && scrollTop > 0)
      deltaY = -speedY
    else if (position.y + targetRect.height > clientHeight - marginY && scrollTop < scrollHeight - clientHeight)
      deltaY = speedY
  }

  if (deltaX || deltaY) {
    container.scrollBy({ left: deltaX, top: deltaY, behavior: 'auto' })
  }
}

function isPointerNearEdge(
  pointer: Position,
  container: HTMLElement | SVGElement,
  margin: number | Position,
  targetRect: DOMRect,
) {
  const [marginX, marginY] = typeof margin === 'number' ? [margin, margin] : [margin.x, margin.y]
  const { clientWidth, clientHeight } = container
  return (
    pointer.x < marginX
    || pointer.x + targetRect.width > clientWidth - marginX
    || pointer.y < marginY
    || pointer.y + targetRect.height > clientHeight - marginY
  )
}

/**
 * Map from @vueuse/core `useDraggable`
 * (`source/vueuse/packages/core/useDraggable/`), which makes an element
 * draggable with the pointer: a `pointerdown` on the `handle` (default the `target`) starts the
 * drag, `pointermove` / `pointerup` / `pointercancel` on the `draggingElement` (default `window`)
 * move and end it, and `x` / `y` track the element's position. The drag position is clamped to the
 * `containerElement` bounds when one is given, and `autoScroll` scrolls a scrollable container
 * while the pointer is near its edges.
 *
 * - the Vue refs returned by upstream (`x`, `y`, `position`, `isDragging`,
 *   `style`) become a plain object backed by React state: `x` / `y` are
 *   numbers, `position` the `{ x, y }` pair, `isDragging` a boolean and
 *   `style` a ready-to-use CSS string (`left: ?px; top: ?px;`); `x` and `y`
 *   are writable through the paired `setX` / `setY` setters (the React
 *   equivalent of assigning upstream's writable refs), which update the
 *   returned state and the internal drag position together;
 * - a self-contained mount `useEffect` that re-subscribes when the resolved `handle` /
 * `draggingElement` or the `capture` / `preventDefault` flags change, and removes all listeners on
 * unmount;
 * - `target`, `handle`, `draggingElement` and `containerElement` accept a React ref object
 * (`RefObject`) holding the element (e.g. the result of `useRef`). They are re-resolved on every
 * render and the listeners re-bind when the resolved element changes; a plain element, a getter and
 * a callback ref are not accepted;
 * - every remaining option (`disabled`, `buttons`, `exact`, `axis`,
 *   `restrictInView`, `autoScroll`, `onStart` / `onMove` / `onEnd`, …) is
 *   read through a latest-value ref, so the stable listeners always see the
 *   newest options without re-subscribing on renders;
 * - a `useEffect` keyed on the position state; the auto-scroll `setInterval` is stopped on drag end
 * and on unmount;
 * - SSR-safe: nothing touches `window` or the DOM during render — only, and `initialValue` seeds
 * the state so SSR renders the same initial position.
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const { x, y, style } = useDraggable(el, { initialValue: { x: 40, y: 40 } })
 */
export function useDraggable(
  target: DraggableTarget,
  options: UseDraggableOptions = {},
): UseDraggableReturn {
  const {
    capture,
    initialValue,
    preventDefault,
    draggingElement,
    handle: draggingHandle,
    autoScroll = false,
  } = options

  const initial = initialValue ?? { x: 0, y: 0 }
  const [position, setPosition] = useState<Position>(initial)
  const [isDragging, setIsDragging] = useState(false)

  // internal mirrors read synchronously by the stable listeners — upstream
  // keeps these in effect-scope closures that are recreated on re-render
  const targetRef = useRef(target)
  targetRef.current = target
  const positionRef = useRef(initial)
  const pressedDeltaRef = useRef<Position | undefined>(undefined)

  // Writable `x` / `y` — the React equivalent of assigning upstream's writable
  // `x` / `y` refs. Functional updates keep the internal mirror and the state
  // in sync even when both setters are called in the same render batch.
  const setX = useCallback((value: number) => {
    setPosition((prev) => {
      const next = { x: value, y: prev.y }
      positionRef.current = next
      return next
    })
  }, [])

  const setY = useCallback((value: number) => {
    setPosition((prev) => {
      const next = { x: prev.x, y: value }
      positionRef.current = next
      return next
    })
  }, [])

  // latest-value ref synced each render so the listeners registered in the
  // mount effect always read the newest options (stable handler identities),
  // with the option defaults upstream applies at destructure time applied so
  // the handler reads are equivalent
  const optionsRef = useRef<UseDraggableOptions>(options)
  optionsRef.current = {
    ...options,
    buttons: options.buttons ?? [0],
    axis: options.axis ?? 'both',
    autoScroll: options.autoScroll ?? false,
  }

  // upstream resolves the scroll settings once at setup (`toValue(autoScroll)`)
  // — mirror it with a one-time state initializer
  const [scrollSettings] = useState<ScrollSettings>(() => {
    const scrollConfig = autoScroll
    return typeof scrollConfig === 'object'
      ? {
          speed: scrollConfig.speed ?? defaultScrollConfig.speed,
          margin: scrollConfig.margin ?? defaultScrollConfig.margin,
          direction: scrollConfig.direction ?? defaultScrollConfig.direction,
        }
      : { ...defaultScrollConfig }
  })

  // dependency-tracking reads: refs populate before effects run, so the first
  // render reports `null` / `undefined` for the ref's `.current` — the effect
  // below re-resolves fresh and re-binds whenever a resolved element changes
  const trackedTarget = target
  const trackedHandle = draggingHandle
  const trackedDraggingElement = draggingElement
  const resolvedPreventDefault = preventDefault
  const resolvedAutoScroll = autoScroll

  const autoScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current)
      autoScrollIntervalRef.current = null
    }
  }, [])

  const startAutoScroll = useCallback(() => {
    const container = optionsRef.current.containerElement ? unrefElement(optionsRef.current.containerElement) : undefined
    if (container && !autoScrollIntervalRef.current) {
      autoScrollIntervalRef.current = setInterval(() => {
        const el = unrefElement(targetRef.current)
        if (!el)
          return
        const targetRect = el.getBoundingClientRect()
        const { x, y } = positionRef.current
        const relativePosition = { x: x - container.scrollLeft, y: y - container.scrollTop }
        if (relativePosition.x >= 0 && relativePosition.y >= 0) {
          handleAutoScroll(container, targetRect, relativePosition, scrollSettings)
          relativePosition.x += container.scrollLeft
          relativePosition.y += container.scrollTop
          positionRef.current = relativePosition
          setPosition(relativePosition)
        }
      }, 1000 / 60)
    }
  }, [scrollSettings])

  const checkAutoScroll = useCallback(() => {
    if (optionsRef.current.disabled || !pressedDeltaRef.current)
      return
    const container = optionsRef.current.containerElement ? unrefElement(optionsRef.current.containerElement) : undefined
    if (!container)
      return
    const el = unrefElement(targetRef.current)
    if (!el)
      return
    const targetRect = el.getBoundingClientRect()
    const { x, y } = positionRef.current
    const relativePosition = { x: x - container.scrollLeft, y: y - container.scrollTop }

    if (isPointerNearEdge(relativePosition, container, scrollSettings.margin, targetRect))
      startAutoScroll()
    else
      stopAutoScroll()
  }, [scrollSettings, startAutoScroll, stopAutoScroll])

  // mirror of upstream's `watch(position, checkAutoScroll)`
  useEffect(() => {
    if (!optionsRef.current.autoScroll)
      return
    checkAutoScroll()
  }, [position, checkAutoScroll])

  // stop the auto-scroll interval on unmount even when the drag never ends
  useEffect(() => () => {
    stopAutoScroll()
  }, [stopAutoScroll])

  useEffect(() => {
    const win = typeof window === 'undefined' ? undefined : window
    if (!win)
      return

    // upstream: `draggingHandle` defaults to the `target`, `draggingElement`
    // to the window — resolve fresh here so a ref whose `.current` populated
    // after the first render binds correctly
    const handleEl = (optionsRef.current.handle ? unrefElement(optionsRef.current.handle) : undefined) ?? unrefElement(targetRef.current)
    const dragEl = (optionsRef.current.draggingElement ? unrefElement(optionsRef.current.draggingElement) : undefined) ?? win
    const listenerOptions: AddEventListenerOptions = {
      capture: capture ?? true,
      passive: !optionsRef.current.preventDefault,
    }

    const filterEvent = (e: PointerEvent) => {
      const types = optionsRef.current.pointerTypes
      if (types)
        return types.includes(e.pointerType as PointerType)
      return true
    }

    const handleEvent = (e: PointerEvent) => {
      const current = optionsRef.current
      if (current.preventDefault)
        e.preventDefault()
      if (current.stopPropagation)
        e.stopPropagation()
    }

    const onPointerDown = (e: PointerEvent) => {
      const current = optionsRef.current
      if (!(current.buttons ?? [0]).includes(e.button))
        return
      if (current.disabled || !filterEvent(e))
        return
      if (current.exact && e.target !== unrefElement(targetRef.current))
        return

      const container = current.containerElement ? unrefElement(current.containerElement) : undefined
      const containerRect = container?.getBoundingClientRect?.()
      const el = unrefElement(targetRef.current)
      if (!el)
        return
      const targetRect = el.getBoundingClientRect()
      const autoScrollEnabled = current.autoScroll
      const pos = {
        x: e.clientX - (container ? targetRect.left - containerRect!.left + (autoScrollEnabled ? 0 : container.scrollLeft) : targetRect.left),
        y: e.clientY - (container ? targetRect.top - containerRect!.top + (autoScrollEnabled ? 0 : container.scrollTop) : targetRect.top),
      }
      if (current.onStart?.(pos, e) === false)
        return
      pressedDeltaRef.current = pos
      setIsDragging(true)
      handleEvent(e)
    }

    const onPointerMove = (e: PointerEvent) => {
      const current = optionsRef.current
      if (current.disabled || !filterEvent(e))
        return
      const delta = pressedDeltaRef.current
      if (!delta)
        return

      const container = current.containerElement ? unrefElement(current.containerElement) : undefined
      if (container instanceof HTMLElement)
        clampContainerScroll(container)

      const el = unrefElement(targetRef.current)
      if (!el)
        return
      const targetRect = el.getBoundingClientRect()
      let { x, y } = positionRef.current
      const axisValue = current.axis ?? 'both'
      if (axisValue === 'x' || axisValue === 'both') {
        x = e.clientX - delta.x
        if (container)
          x = Math.min(Math.max(0, x), container.scrollWidth - targetRect.width)
      }
      if (axisValue === 'y' || axisValue === 'both') {
        y = e.clientY - delta.y
        if (container)
          y = Math.min(Math.max(0, y), container.scrollHeight - targetRect.height)
      }

      if (current.autoScroll && container) {
        if (autoScrollIntervalRef.current === null)
          handleAutoScroll(container, targetRect, { x, y }, scrollSettings)

        x += container.scrollLeft
        y += container.scrollTop
      }
      if (container && (current.restrictInView || current.autoScroll)) {
        if (axisValue !== 'y') {
          const relativeX = x - container.scrollLeft
          if (relativeX < 0)
            x = container.scrollLeft
          else if (relativeX > container.clientWidth - targetRect.width)
            x = container.clientWidth - targetRect.width + container.scrollLeft
        }
        if (axisValue !== 'x') {
          const relativeY = y - container.scrollTop
          if (relativeY < 0)
            y = container.scrollTop
          else if (relativeY > container.clientHeight - targetRect.height)
            y = container.clientHeight - targetRect.height + container.scrollTop
        }
      }

      const nextPos = { x, y }
      positionRef.current = nextPos
      setPosition(nextPos)
      current.onMove?.(nextPos, e)
      handleEvent(e)
    }

    const onPointerUp = (e: PointerEvent) => {
      const current = optionsRef.current
      if (current.disabled || !filterEvent(e))
        return
      if (!pressedDeltaRef.current)
        return
      pressedDeltaRef.current = undefined
      setIsDragging(false)
      if (current.autoScroll)
        stopAutoScroll()
      current.onEnd?.(positionRef.current, e)
      handleEvent(e)
    }

    const listeners: Array<[EventTarget | null | undefined, string, EventListener]> = [
      [handleEl, 'pointerdown', onPointerDown as EventListener],
      [dragEl, 'pointermove', onPointerMove as EventListener],
      [dragEl, 'pointerup', onPointerUp as EventListener],
      [dragEl, 'pointercancel', onPointerUp as EventListener],
    ]
    listeners.forEach(([el, type, handler]) => el?.addEventListener(type, handler, listenerOptions))

    return () => {
      listeners.forEach(([el, type, handler]) => el?.removeEventListener(type, handler, listenerOptions))
    }
  }, [trackedTarget, trackedHandle, trackedDraggingElement, capture, resolvedPreventDefault, scrollSettings, stopAutoScroll])

  const positionValue = useMemo<Position>(() => ({ x: position.x, y: position.y }), [position.x, position.y])

  const style = useMemo(() => {
    const base = `left: ${position.x}px; top: ${position.y}px;`
    return resolvedAutoScroll ? `${base} text-wrap: nowrap;` : base
  }, [position.x, position.y, resolvedAutoScroll])

  return {
    x: position.x,
    y: position.y,
    position: positionValue,
    isDragging,
    style,
    setX,
    setY,
  }
}
