import type { ElementTarget, TargetElement, UseResizeObserverOptions } from '../useResizeObserver'
import { toArray } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'
import { useResizeObserver } from '../useResizeObserver'

export interface ElementSize {
  width: number
  height: number
}

export interface UseElementSizeOptions extends UseResizeObserverOptions {
}

export interface UseElementSizeReturn {
  width: number
  height: number
  stop: () => void
}

/**
 * Reactive size of an HTML element.
 *
 * Map from @vueuse/core `useElementSize`
 * (`source/vueuse/packages/core/useElementSize/`), which observes the target
 * element with a platform `ResizeObserver` and reports the size of the box selected by the `box`
 * option (`border-box`, `content-box` or `device-pixel-content-box`), falling back to
 * `getBoundingClientRect` for SVG elements and to `contentRect` when the box sizes are unavailable.
 *
 * React divergences:
 * - `width`/`height` are plain `number` state, so the return value is `{ width, height, stop }` —
 * an object mirror, not a tuple;
 * - the upstream `tryOnMounted` prefill (from `offsetWidth`/`offsetHeight`,
 *   with padding/border subtracted for `content-box`) becomes a mount-only
 *   effect, so the size is correct before the first async observer delivery;
 * - the upstream `watch(() => unrefElement(target)...)` (reset the size to `initialSize`, or `0`
 * when detached, whenever the resolved target element changes) becomes an effect that re-resolves
 * the target after every render and resets only when the resolved element actually changed;
 * - `stop()` is referentially stable, disconnects the observer and disables
 *   the target-change reset;
 * - the `window` option, falling back to `contentRect` / plain `offsetWidth`.
 *
 * SSR-safe: nothing touches `window` during render — the observer, the prefill and the reset all
 * happen in effects.
 *
 * @example
 * const el = useRef<HTMLTextAreaElement | null>(null)
 * const { width, height, stop } = useElementSize(el)
 */
export function useElementSize(
  target: ElementTarget,
  initialSize: ElementSize = { width: 0, height: 0 },
  options: UseElementSizeOptions = {},
): UseElementSizeReturn {
  const { window: customWindow, box = 'content-box' } = options
  // Mirror upstream's `{ window = defaultWindow }` destructure: an explicit
  // `window: null` stays null (falsy) and disables the SVG-rect branch and the
  // content-box computed-style prefill below — only an omitted option falls
  // back to the global `window`.
  const win = customWindow === undefined
    ? (typeof window === 'undefined' ? undefined : window)
    : customWindow

  // Latest-value refs so effects always work with the newest target/size
  // without re-running on their identity (mirrors `useResizeObserver`).
  const targetRef = useRef(target)
  const initialSizeRef = useRef(initialSize)
  targetRef.current = target
  initialSizeRef.current = initialSize

  const [width, setWidth] = useState(initialSize.width)
  const [height, setHeight] = useState(initialSize.height)

  const { stop: stopResizeObserver } = useResizeObserver(
    target,
    ([entry]) => {
      const boxSize = box === 'border-box'
        ? entry.borderBoxSize
        : box === 'content-box'
          ? entry.contentBoxSize
          : entry.devicePixelContentBoxSize

      // isSVG mirrors upstream's `computed(() => unrefElement(target)?.namespaceURI?.includes('svg'))`
      // — keyed off the resolved target, not `entry.target`, so a stale
      // delivery from a previous target after a switch doesn't take the
      // SVG branch.
      if (win && unrefElement(targetRef.current)?.namespaceURI?.includes('svg')) {
        const $elem = unrefElement(targetRef.current)
        if ($elem) {
          const rect = $elem.getBoundingClientRect()
          setWidth(rect.width)
          setHeight(rect.height)
        }
      }
      else if (boxSize) {
        const formatBoxSize = toArray(boxSize)
        setWidth(formatBoxSize.reduce((acc, { inlineSize }) => acc + inlineSize, 0))
        setHeight(formatBoxSize.reduce((acc, { blockSize }) => acc + blockSize, 0))
      }
      else {
        // fallback
        setWidth(entry.contentRect.width)
        setHeight(entry.contentRect.height)
      }
    },
    options,
  )

  // Mount-time prefill (upstream: `tryOnMounted`) — measure synchronously so
  // the size is correct before the first async ResizeObserver delivery.
  useEffect(() => {
    const ele = unrefElement(targetRef.current)
    if (ele && 'offsetWidth' in ele) {
      if (box === 'content-box' && win) {
        const cs = win.getComputedStyle(ele)
        const padX = Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight)
        const padY = Number.parseFloat(cs.paddingTop) + Number.parseFloat(cs.paddingBottom)
        const bdX = Number.parseFloat(cs.borderLeftWidth) + Number.parseFloat(cs.borderRightWidth)
        const bdY = Number.parseFloat(cs.borderTopWidth) + Number.parseFloat(cs.borderBottomWidth)
        setWidth(ele.offsetWidth - padX - bdX)
        setHeight(ele.offsetHeight - padY - bdY)
      }
      else {
        setWidth(ele.offsetWidth)
        setHeight(ele.offsetHeight)
      }
    }
    else if (ele) {
      setWidth(initialSizeRef.current.width)
      setHeight(initialSizeRef.current.height)
    }
  }, [])

  // Target-change reset (upstream: `watch(() => unrefElement(target), ...)`).
  // Re-resolve the element after every render and reset the size to
  // `initialSize` (or `0` when detached) only when the resolved element
  // actually changed — the observer then re-delivers the real size.
  const stoppedRef = useRef(false)
  const previousElementRef = useRef<TargetElement>(undefined)
  const firstRunRef = useRef(true)

  useEffect(() => {
    if (stoppedRef.current)
      return

    const ele = unrefElement(targetRef.current)
    if (firstRunRef.current) {
      firstRunRef.current = false
      previousElementRef.current = ele
      return
    }

    if (previousElementRef.current !== ele) {
      setWidth(ele ? initialSizeRef.current.width : 0)
      setHeight(ele ? initialSizeRef.current.height : 0)
      previousElementRef.current = ele
    }
  })

  const stop = useCallback(() => {
    if (stoppedRef.current)
      return
    stoppedRef.current = true
    stopResizeObserver()
  }, [stopResizeObserver])

  return {
    width,
    height,
    stop,
  }
}
