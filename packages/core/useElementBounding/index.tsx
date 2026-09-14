import type { ConfigurableWindow } from '@reause/shared'
import type { ElementTarget, TargetElement } from '../useResizeObserver'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'
import { useMutationObserver } from '../useMutationObserver'
import { useResizeObserver } from '../useResizeObserver'

/**
 * Options for `useElementBounding`: `reset` (re-zero on detached element), `windowResize` /
 * `windowScroll` (window listeners), `immediate` (measure on mount) and `updateTiming` (`'sync'` or
 * `'next-frame'`), plus a custom `window` instance, e.g. working with iframes or in testing
 * environments.
 */
export interface UseElementBoundingOptions extends ConfigurableWindow {
  /**
   * Reset values to 0 when the element is unmounted / detached.
   *
   * @default true
   */
  reset?: boolean

  /**
   * Listen to window resize event
   *
   * @default true
   */
  windowResize?: boolean

  /**
   * Listen to window scroll event
   *
   * @default true
   */
  windowScroll?: boolean

  /**
   * Immediately call update on component mounted
   *
   * @default true
   */
  immediate?: boolean

  /**
   * Timing to recalculate the bounding box
   *
   * Setting to `next-frame` can be useful when using this together with something like
   * `useBreakpoints` and therefore the layout (which influences the bounding box of the observed
   * element) is not updated on the current tick.
   *
   * @default 'sync'
   */
  updateTiming?: 'sync' | 'next-frame'
}

/**
 * Return of `useElementBounding`. Upstream exposes `ShallowRef`s; the React port exposes plain
 * `number` state plus the `update` function.
 */
export interface UseElementBoundingReturn {
  height: number
  bottom: number
  left: number
  right: number
  top: number
  width: number
  x: number
  y: number
  update: () => void
}

/**
 * Reactive bounding box of an HTML element.
 *
 * Map from @vueuse/core `useElementBounding`
 * (`source/vueuse/packages/core/useElementBounding/`), which measures the
 * target with `getBoundingClientRect()` and re-measures on window `scroll`/`resize`, on
 * `style`/`class` mutations (MutationObserver) and on element size changes (ResizeObserver).
 *
 * React divergences:
 * - `target` accepts a React ref object (`RefObject`) holding the element; a plain element, a
 * getter and a callback ref are not accepted;
 * - an effect that re-resolves the target after every render and re-measures only when the resolved
 * element actually became `null`;
 * - upstream's `tryOnMounted` immediate measurement happens in a mount-only
 *   effect, so the values are correct before the first async observer
 *   delivery;
 * - the window `scroll`/`resize` listeners attach in a mount effect; the component and directive
 * variants (`UseElementBounding` / `v-element-bounding`) are not ported — they have no React
 * equivalents;
 * - SSR-safe: nothing touches `window` or the DOM during render — all
 *   measurements happen in effects.
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   measure the bounding box of, resolved with the shared `unrefElement`
 * @param options - `reset` (default `true`), `windowResize` (default `true`),
 *   `windowScroll` (default `true`), `immediate` (default `true`),
 *   `updateTiming` (default `'sync'`), and a custom `window` instance
 * @example
 * const el = useRef<HTMLDivElement | null>(null)
 * const { x, y, top, right, bottom, left, width, height } = useElementBounding(el)
 */
export function useElementBounding(
  target: ElementTarget,
  options: UseElementBoundingOptions = {},
): UseElementBoundingReturn {
  // Latest-value refs so effects/observers always work with the newest
  // target/options without re-running on their identity (mirrors the sibling
  // `useElementSize` / `useElementOverflow` ports).
  const targetRef = useRef(target)
  const optionsRef = useRef(options)
  targetRef.current = target
  optionsRef.current = options

  const [height, setHeight] = useState(0)
  const [bottom, setBottom] = useState(0)
  const [left, setLeft] = useState(0)
  const [right, setRight] = useState(0)
  const [top, setTop] = useState(0)
  const [width, setWidth] = useState(0)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)

  // upstream's internal `recalculate()`: resolve the target and read its
  // `getBoundingClientRect()`, resetting every value to 0 when no element is
  // attached (unless `reset: false`).
  const recalculate = useCallback(() => {
    const el = unrefElement(targetRef.current)

    if (!el) {
      if (optionsRef.current.reset !== false) {
        setHeight(0)
        setBottom(0)
        setLeft(0)
        setRight(0)
        setTop(0)
        setWidth(0)
        setX(0)
        setY(0)
      }
      return
    }

    const rect = el.getBoundingClientRect()

    setHeight(rect.height)
    setBottom(rect.bottom)
    setLeft(rect.left)
    setRight(rect.right)
    setTop(rect.top)
    setWidth(rect.width)
    setX(rect.x)
    setY(rect.y)
  }, [])

  // upstream's public `update()`: re-measure immediately, or defer to the next
  // animation frame when `updateTiming: 'next-frame'`.
  const update = useCallback(() => {
    const { updateTiming = 'sync', window: customWindow } = optionsRef.current

    if (updateTiming === 'next-frame') {
      const win = customWindow ?? (typeof window === 'undefined' ? undefined : window)
      if (win) {
        win.requestAnimationFrame(() => recalculate())
        return
      }
    }
    recalculate()
  }, [recalculate])

  // upstream: `watch(() => unrefElement(target), ele => !ele && update())`.
  // Re-resolve the target after every render and re-measure only when the
  // resolved element actually became `null` (which resets the values when
  // `reset` is enabled). The first run just records the element — the
  // immediate mount effect below performs the initial measurement.
  const previousElementRef = useRef<TargetElement>(undefined)
  useEffect(() => {
    const el = unrefElement(targetRef.current)
    if (previousElementRef.current !== el) {
      previousElementRef.current = el
      if (!el)
        update()
    }
  })

  // upstream: `useResizeObserver(target, update)` — re-measure when the
  // element's size changes.
  useResizeObserver(target, update)

  // upstream: `useMutationObserver(target, update, { attributeFilter: ['style', 'class'] })`
  // — re-measure when the element's `style`/`class` attributes change
  // (triggered by CSS or inline styles).
  useMutationObserver(target, update, { attributeFilter: ['style', 'class'] })

  // upstream: `useEventListener('scroll'/'resize', update, ...)` — re-measure
  // on window scroll (capture) and resize, gated by the options.
  useEffect(() => {
    const { windowScroll = true, windowResize = true, window: customWindow } = optionsRef.current
    const win = customWindow ?? (typeof window === 'undefined' ? undefined : window)
    if (!win)
      return

    if (windowScroll)
      win.addEventListener('scroll', update, { capture: true, passive: true })
    if (windowResize)
      win.addEventListener('resize', update, { passive: true })

    return () => {
      if (windowScroll)
        win.removeEventListener('scroll', update, { capture: true })
      if (windowResize)
        win.removeEventListener('resize', update)
    }
  }, [update])

  // upstream: `tryOnMounted(() => { if (immediate) update() })` — measure
  // synchronously on mount so the values are correct before the first async
  // observer delivery.
  useEffect(() => {
    if (optionsRef.current.immediate !== false)
      update()
  }, [update])

  return {
    height,
    bottom,
    left,
    right,
    top,
    width,
    x,
    y,
    update,
  }
}
