import type { RefObject } from 'react'
import type { UseMouseCoordType, UseMouseEventExtractor, UseMouseOptions, UseMouseSourceType } from '../useMouse'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'
import { useMouse } from '../useMouse'

export interface MouseInElementOptions extends UseMouseOptions {
  /**
   * Whether to handle mouse events when the cursor is outside the target element. When enabled,
   * mouse position will continue to be tracked even when outside the element bounds.
   *
   * @default true
   */
  handleOutside?: boolean

  /**
   * Listen to window resize event
   *
   * @default true
   */
  windowScroll?: boolean

  /**
   * Listen to window scroll event
   *
   * @default true
   */
  windowResize?: boolean
}

export interface UseMouseInElementReturn {
  x: number
  y: number
  sourceType: UseMouseSourceType
  elementX: number
  elementY: number
  elementPositionX: number
  elementPositionY: number
  elementHeight: number
  elementWidth: number
  isOutside: boolean
  stop: () => void
}

interface MouseInElementState {
  elementX: number
  elementY: number
  elementPositionX: number
  elementPositionY: number
  elementHeight: number
  elementWidth: number
  isOutside: boolean
}

interface NormalizedOptions {
  handleOutside: boolean
  windowScroll: boolean
  windowResize: boolean
  type: UseMouseCoordType | UseMouseEventExtractor
}

function normalizeOptions(options: MouseInElementOptions): NormalizedOptions {
  return {
    handleOutside: options.handleOutside ?? true,
    windowScroll: options.windowScroll ?? true,
    windowResize: options.windowResize ?? true,
    type: options.type ?? 'page',
  }
}

function resolveWindow(options: MouseInElementOptions): Window | undefined {
  if (options.window)
    return options.window
  return typeof window === 'undefined' ? undefined : window
}

function resolveTargetElement(
  target: RefObject<HTMLElement | null | undefined> | undefined,
  win: Window | undefined,
): Element | undefined {
  const el = target ? unrefElement(target) : undefined
  if (el)
    return el
  return win?.document.body ?? undefined
}

/**
 * Map from @vueuse/core `useMouseInElement`
 * (`source/vueuse/packages/core/useMouseInElement/`).
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   measure the mouse position against, resolved with the shared `unrefElement`
 * @param options - `UseMouseOptions` (`target`, `window`, `type` incl. a
 *   custom extractor, `touch`, `scroll`, `resetOnTouchEnds`, `eventFilter`,
 *   `initialValue`) plus `handleOutside` (default `true`) and `windowScroll` /
 *   `windowResize` (default `true`)
 *
 * @example
 * const target = useRef<HTMLDivElement>(null)
 * const { x, y, elementX, elementY, isOutside } = useMouseInElement(target)
 */
export function useMouseInElement(
  target?: RefObject<HTMLElement | null | undefined>,
  options: MouseInElementOptions = {},
): UseMouseInElementReturn {
  // upstream composes `useMouse(options)`: every `UseMouseOptions` field is
  // forwarded verbatim, and its listeners stay alive across `stop()`
  const { x, y, sourceType } = useMouse(options)

  const targetRef = useRef(target)
  const optionsRef = useRef(options)
  targetRef.current = target
  optionsRef.current = options

  const [state, setState] = useState<MouseInElementState>(() => ({
    elementX: 0,
    elementY: 0,
    elementPositionX: 0,
    elementPositionY: 0,
    elementHeight: 0,
    elementWidth: 0,
    isOutside: true,
  }))
  const stateRef = useRef(state)
  // latest cursor position for the event-time metric math (read through refs
  // so the effects never observe stale state)
  const mouseRef = useRef({ x, y })
  mouseRef.current = { x, y }
  const stoppedRef = useRef(false)
  const previousElementRef = useRef<Element | null | undefined>(undefined)
  const mutationObserverRef = useRef<{ observer: MutationObserver, element: Element } | null>(null)
  const resizeObserverRef = useRef<{ observer: ResizeObserver, element: Element } | null>(null)
  const detachRef = useRef<(() => void) | null>(null)

  // Apply a new state snapshot, skipping renders when nothing actually changed.
  const commit = useCallback((next: MouseInElementState) => {
    const prev = stateRef.current
    if (
      prev.elementX === next.elementX
      && prev.elementY === next.elementY
      && prev.elementPositionX === next.elementPositionX
      && prev.elementPositionY === next.elementPositionY
      && prev.elementHeight === next.elementHeight
      && prev.elementWidth === next.elementWidth
      && prev.isOutside === next.isOutside
    ) {
      return
    }
    stateRef.current = next
    setState(next)
  }, [])

  // Recompute the element metrics from the latest cursor position and the
  // target element's current rects (upstream: the `watch([targetRef, x, y])`).
  const update = useCallback(() => {
    if (stoppedRef.current)
      return

    const win = resolveWindow(optionsRef.current)
    if (!win)
      return

    const el = resolveTargetElement(targetRef.current, win)
    if (!el || !(el instanceof Element))
      return

    const { handleOutside, type } = normalizeOptions(optionsRef.current)
    const { x: mouseX, y: mouseY } = mouseRef.current
    const prev = stateRef.current

    let { elementX, elementY } = prev
    let { elementPositionX, elementPositionY, elementHeight, elementWidth, isOutside } = prev

    for (const rect of el.getClientRects()) {
      const { left, top, width, height } = rect

      elementPositionX = left + (type === 'page' ? win.pageXOffset : 0)
      elementPositionY = top + (type === 'page' ? win.pageYOffset : 0)
      elementHeight = height
      elementWidth = width

      const elX = mouseX - elementPositionX
      const elY = mouseY - elementPositionY
      isOutside = width === 0 || height === 0
        || elX < 0 || elY < 0
        || elX > width || elY > height

      if (handleOutside || !isOutside) {
        elementX = elX
        elementY = elY
      }

      if (!isOutside)
        break
    }

    commit({
      elementX,
      elementY,
      elementPositionX,
      elementPositionY,
      elementHeight,
      elementWidth,
      isOutside,
    })
  }, [commit])

  const win = resolveWindow(options)

  // `watch([targetRef, x, y], update)` analog — the cursor position comes from
  // the composed `useMouse`, so its changes drive the metric refresh.
  useEffect(() => {
    if (stoppedRef.current)
      return
    update()
  }, [update, x, y])

  // document `mouseleave` — upstream keeps this listener outside `stopFnList`,
  // so `isOutside` keeps flipping to `true` after `stop()`.
  useEffect(() => {
    if (!win)
      return
    const handler = () => {
      commit({ ...stateRef.current, isOutside: true })
    }
    const listenerOptions: AddEventListenerOptions = { passive: true }
    win.document.addEventListener('mouseleave', handler, listenerOptions)
    return () => win.document.removeEventListener('mouseleave', handler, listenerOptions)
  }, [win, commit])

  // Element tracking + MutationObserver/ResizeObserver (upstream:
  // `useMutationObserver` + `useResizeObserver`). Runs after every render and
  // re-observes only when the resolved element actually changed.
  useEffect(() => {
    if (stoppedRef.current)
      return

    const element = resolveTargetElement(targetRef.current, win)

    if (element !== previousElementRef.current) {
      previousElementRef.current = element
      if (element)
        update()
    }

    if (win && element && 'MutationObserver' in win) {
      const current = mutationObserverRef.current
      if (!current || current.element !== element) {
        current?.observer.disconnect()
        const observer = new MutationObserver(update)
        observer.observe(element, { attributeFilter: ['style', 'class'] })
        mutationObserverRef.current = { observer, element }
      }
    }
    else if (mutationObserverRef.current) {
      mutationObserverRef.current.observer.disconnect()
      mutationObserverRef.current = null
    }

    if (win && element && 'ResizeObserver' in win) {
      const current = resizeObserverRef.current
      if (!current || current.element !== element) {
        current?.observer.disconnect()
        const observer = new ResizeObserver(update)
        observer.observe(element)
        resizeObserverRef.current = { observer, element }
      }
    }
    else if (resizeObserverRef.current) {
      resizeObserverRef.current.observer.disconnect()
      resizeObserverRef.current = null
    }
  })

  // `windowScroll` / `windowResize` refresh listeners — upstream pushes these
  // into `stopFnList`, so `stop()` detaches them for good.
  useEffect(() => {
    if (stoppedRef.current)
      return
    if (!win)
      return

    const { windowScroll, windowResize } = normalizeOptions(optionsRef.current)
    const listenerOptions: AddEventListenerOptions = { passive: true }

    if (windowScroll)
      win.addEventListener('scroll', update, { capture: true, passive: true })
    if (windowResize)
      win.addEventListener('resize', update, listenerOptions)

    const detach = () => {
      win.removeEventListener('scroll', update, { capture: true })
      win.removeEventListener('resize', update, listenerOptions)
      detachRef.current = null
    }
    detachRef.current = detach

    return detach
  }, [update, win, options.windowScroll, options.windowResize])

  // Disconnect the observers on unmount.
  useEffect(() => () => {
    mutationObserverRef.current?.observer.disconnect()
    mutationObserverRef.current = null
    resizeObserverRef.current?.observer.disconnect()
    resizeObserverRef.current = null
  }, [])

  const stop = useCallback(() => {
    stoppedRef.current = true
    detachRef.current?.()
    detachRef.current = null
    mutationObserverRef.current?.observer.disconnect()
    mutationObserverRef.current = null
    resizeObserverRef.current?.observer.disconnect()
    resizeObserverRef.current = null
  }, [])

  return {
    x,
    y,
    sourceType,
    elementX: state.elementX,
    elementY: state.elementY,
    elementPositionX: state.elementPositionX,
    elementPositionY: state.elementPositionY,
    elementHeight: state.elementHeight,
    elementWidth: state.elementWidth,
    isOutside: state.isOutside,
    stop,
  }
}
