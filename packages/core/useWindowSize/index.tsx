import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useRef, useState } from 'react'

export interface UseWindowSizeOptions extends ConfigurableWindow {
  initialWidth?: number
  initialHeight?: number
  /**
   * Listen to the `orientation: portrait` media-query change (upstream's stand-in for the
   * `orientationchange` event).
   *
   * @default true
   */
  listenOrientation?: boolean
  /**
   * Whether the scrollbar should be included in the width and height. Only effective when `type` is
   * `'inner'`.
   *
   * @default true
   */
  includeScrollbar?: boolean
  /**
   * Use `window.innerWidth` or `window.outerWidth` or `window.visualViewport`.
   *
   * @default 'inner'
   */
  type?: 'inner' | 'outer' | 'visual'
}

export interface UseWindowSizeReturn {
  width: number
  height: number
}

/**
 * Map from @vueuse/core `useWindowSize`
 * (`source/vueuse/packages/core/useWindowSize/`).
 *
 * @example
 * const { width, height } = useWindowSize()
 */
export function useWindowSize(options: UseWindowSizeOptions = {}): UseWindowSizeReturn {
  const {
    initialWidth = Number.POSITIVE_INFINITY,
    initialHeight = Number.POSITIVE_INFINITY,
    listenOrientation = true,
    includeScrollbar = true,
    type = 'inner',
  } = options

  const [size, setSize] = useState<UseWindowSizeReturn>({ width: initialWidth, height: initialHeight })

  // upstream reads its options once at setup (`source/vueuse/.../index.ts:49-56`)
  // and ignores later mutations — mirror that by capturing the
  // defaults-resolved options on the first render; the listeners attach once
  // and never re-subscribe on a mid-life option change
  const capturedRef = useRef({ window: options.window, listenOrientation, includeScrollbar, type })
  const captured = capturedRef.current

  useEffect(() => {
    const win = captured.window ?? (typeof window === 'undefined' ? undefined : window)
    if (!win)
      return

    const { type = 'inner', includeScrollbar = true, listenOrientation = true } = captured

    const update = () => {
      if (type === 'outer') {
        setSize({ width: win.outerWidth, height: win.outerHeight })
      }
      else if (type === 'visual' && win.visualViewport) {
        const { width: viewportWidth, height: viewportHeight, scale } = win.visualViewport
        setSize({ width: Math.round(viewportWidth * scale), height: Math.round(viewportHeight * scale) })
      }
      else if (includeScrollbar) {
        setSize({ width: win.innerWidth, height: win.innerHeight })
      }
      else {
        setSize({ width: win.document.documentElement.clientWidth, height: win.document.documentElement.clientHeight })
      }
    }

    update()

    const listeners: Array<() => void> = []
    const listen = (target: EventTarget, event: string, handler: () => void) => {
      target.addEventListener(event, handler, { passive: true })
      listeners.push(() => target.removeEventListener(event, handler))
    }

    listen(win, 'resize', update)

    if (type === 'visual' && win.visualViewport)
      listen(win.visualViewport, 'resize', update)

    if (listenOrientation && typeof win.matchMedia === 'function') {
      const orientationMedia = win.matchMedia('(orientation: portrait)')
      listen(orientationMedia, 'change', update)
    }

    return () => {
      listeners.forEach(remove => remove())
    }
  }, [])

  return size
}
