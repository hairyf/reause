import type { ConfigurableWindow, EventFilter } from '@reause/shared'
import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

export type UseMouseCoordType = 'page' | 'client' | 'screen' | 'movement'
export type UseMouseSourceType = 'mouse' | 'touch' | null
export type UseMouseEventExtractor = (event: MouseEvent | Touch) => [x: number, y: number] | null | undefined

interface Position {
  x: number
  y: number
}

export interface UseMouseOptions extends ConfigurableWindow {
  /**
   * Mouse position based by page, client, screen, or relative to previous position
   *
   * @default 'page'
   */
  type?: UseMouseCoordType | UseMouseEventExtractor

  /**
   * Listen events on `target` element
   *
   * @default 'Window'
   */
  target?: RefObject<Window | EventTarget | null | undefined>

  /**
   * Listen to `touchmove` events
   *
   * @default true
   */
  touch?: boolean

  /**
   * Listen to `scroll` events on window, only effective on type `page`
   *
   * @default true
   */
  scroll?: boolean

  /**
   * Reset to initial value when `touchend` event fired
   *
   * @default false
   */
  resetOnTouchEnds?: boolean

  /**
   * Initial values
   */
  initialValue?: Position

  /**
   * Filter for if events should to be received.
   */
  eventFilter?: EventFilter
}

export interface UseMouseReturn {
  x: number
  y: number
  sourceType: UseMouseSourceType
}

const UseMouseBuiltinExtractors: Record<UseMouseCoordType, UseMouseEventExtractor> = {
  page: event => [event.pageX, event.pageY],
  client: event => [event.clientX, event.clientY],
  screen: event => [event.screenX, event.screenY],
  movement: event => (event instanceof MouseEvent
    ? [event.movementX, event.movementY]
    : null
  ),
}

/**
 * Reactive mouse position.
 *
 * Map from @vueuse/core `useMouse`
 * (`source/vueuse/packages/core/useMouse/`), which listens to
 * `mousemove` / `dragover` (+ `touchstart` / `touchmove` when `touch` is enabled, `touchend` reset
 * when `resetOnTouchEnds` is set) on the `target` option (default `window`), extracts the cursor
 * coordinates with the `type` extractor (`page` by default, or `client` / `screen` / `movement` / a
 * custom `UseMouseEventExtractor`) and tracks which input produced the last position in
 * `sourceType`. A `scroll` listener on `window` compensates the `page` coordinates while the page
 * scrolls.
 *
 * React divergences:
 * - a self-contained mount `useEffect` that re-subscribes when the resolved `target` / the resolved
 * `window` option / the `type` mode / the `touch` / `scroll` / `resetOnTouchEnds` flags change and
 * removes all listeners on unmount;
 * - `target` accepts a React ref object (`RefObject`) holding the element; it is re-resolved on
 * every render and the listeners re-bind when the resolved element changes. Not passing `target`
 * listens on the `window` option (default the global `window`), while a ref whose `.current` is
 * `null` attaches nothing — exactly like upstream.
 * - `initialValue` is folded into the `useState` initializers and read back
 *   by the `touchend` reset through a latest-value ref, so SSR renders the
 *   defaults (`x: 0`, `y: 0`, `sourceType: null`) without touching `window`;
 * - the `eventFilter` wrapper forwards upstream's placeholder second argument (`{}`) so a chained
 * filter reads an object instead of `undefined`.
 *
 * @example
 * const { x, y, sourceType } = useMouse()
 */
export function useMouse(options: UseMouseOptions = {}): UseMouseReturn {
  const {
    type = 'page',
    touch = true,
    resetOnTouchEnds = false,
    initialValue = { x: 0, y: 0 },
    window: customWindow,
    target,
    scroll = true,
    eventFilter,
  } = options

  const extractor = typeof type === 'function' ? type : UseMouseBuiltinExtractors[type]

  const [x, setX] = useState(initialValue.x)
  const [y, setY] = useState(initialValue.y)
  const [sourceType, setSourceType] = useState<UseMouseSourceType>(null)

  // latest-value refs synced each render so the listeners registered in the
  // mount effect always read the newest options (stable handler identities,
  // no re-subscription on option-only renders); the resolved `window` is the
  // exception — it is a dependency of the mount effect so a window-only
  // option change re-binds the listeners instead of leaving them on the old
  // window
  const resolvedWindow = customWindow ?? (typeof window === 'undefined' ? undefined : window)
  const targetRef = useRef(target)
  targetRef.current = target
  const extractorRef = useRef(extractor)
  extractorRef.current = extractor
  const eventFilterRef = useRef(eventFilter)
  eventFilterRef.current = eventFilter
  const initialValueRef = useRef(initialValue)
  initialValueRef.current = initialValue

  // internal mirrors read synchronously by the handlers — upstream keeps them
  // as effect-scope closures that are recreated on re-render
  const prevMouseEventRef = useRef<MouseEvent | null>(null)
  const prevScrollXRef = useRef(0)
  const prevScrollYRef = useRef(0)

  // the string `type` gates which listeners attach (`movement` disables touch,
  // `page` enables the scroll compensation) — resolved during render so the
  // effect re-binds when the type mode changes, while a custom extractor
  // function identity never re-binds (read through `extractorRef`)
  const typeMode = typeof type === 'string' ? type : 'custom'

  // dependency-tracking read: refs populate before effects run, so the first
  // render reports `undefined` for the ref's `.current` — the effect below
  // re-resolves fresh and re-binds whenever the resolved element changes
  const trackedTarget = target

  useEffect(() => {
    const win = resolvedWindow
    // upstream defaults `target` to the `window` option; an explicit `null`
    // (or a ref whose `.current` resolves to nullish) attaches no listeners at all
    const el = targetRef.current === undefined ? win : unrefElement(targetRef.current)
    if (!el)
      return

    const listenerOptions: AddEventListenerOptions = { passive: true }

    const mouseHandler = (event: MouseEvent) => {
      const result = extractorRef.current(event)
      prevMouseEventRef.current = event

      if (result) {
        setX(result[0])
        setY(result[1])
        setSourceType('mouse')
      }

      if (win) {
        prevScrollXRef.current = win.scrollX
        prevScrollYRef.current = win.scrollY
      }
    }

    const touchHandler = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const result = extractorRef.current(event.touches[0])
        if (result) {
          setX(result[0])
          setY(result[1])
          setSourceType('touch')
        }
      }
    }

    const scrollHandler = () => {
      const prevMouseEvent = prevMouseEventRef.current
      if (!prevMouseEvent || !win)
        return
      const pos = extractorRef.current(prevMouseEvent)
      if (prevMouseEvent instanceof MouseEvent && pos) {
        setX(pos[0] + win.scrollX - prevScrollXRef.current)
        setY(pos[1] + win.scrollY - prevScrollYRef.current)
      }
    }

    const reset = () => {
      setX(initialValueRef.current.x)
      setY(initialValueRef.current.y)
    }

    const run = (fn: () => void) => {
      const filter = eventFilterRef.current
      if (filter)
        filter(fn, {})
      else
        fn()
    }

    const mouseHandlerWrapper = (event: MouseEvent) => run(() => mouseHandler(event))
    const touchHandlerWrapper = (event: TouchEvent) => run(() => touchHandler(event))
    const scrollHandlerWrapper = () => run(() => scrollHandler())

    el.addEventListener('mousemove', mouseHandlerWrapper as EventListener, listenerOptions)
    el.addEventListener('dragover', mouseHandlerWrapper as EventListener, listenerOptions)

    const useTouch = touch && typeMode !== 'movement'
    if (useTouch) {
      el.addEventListener('touchstart', touchHandlerWrapper as EventListener, listenerOptions)
      el.addEventListener('touchmove', touchHandlerWrapper as EventListener, listenerOptions)
      if (resetOnTouchEnds)
        el.addEventListener('touchend', reset as EventListener, listenerOptions)
    }

    if (win && scroll && typeMode === 'page')
      win.addEventListener('scroll', scrollHandlerWrapper, listenerOptions)

    return () => {
      el.removeEventListener('mousemove', mouseHandlerWrapper as EventListener, listenerOptions)
      el.removeEventListener('dragover', mouseHandlerWrapper as EventListener, listenerOptions)
      if (useTouch) {
        el.removeEventListener('touchstart', touchHandlerWrapper as EventListener, listenerOptions)
        el.removeEventListener('touchmove', touchHandlerWrapper as EventListener, listenerOptions)
        if (resetOnTouchEnds)
          el.removeEventListener('touchend', reset as EventListener, listenerOptions)
      }
      if (win && scroll && typeMode === 'page')
        win.removeEventListener('scroll', scrollHandlerWrapper, listenerOptions)
    }
  }, [trackedTarget, resolvedWindow, typeMode, touch, scroll, resetOnTouchEnds])

  return {
    x,
    y,
    sourceType,
  }
}
