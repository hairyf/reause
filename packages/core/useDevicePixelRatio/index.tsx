import type { ConfigurableWindow } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseDevicePixelRatioOptions extends ConfigurableWindow {
}

export interface UseDevicePixelRatioReturn {
  pixelRatio: number
  /**
   * Stop tracking: removes the current `matchMedia` change listener and prevents any future
   * re-subscription (upstream's `WatchStopHandle`).
   */
  stop: () => void
}

/**
 * Reactively track `window.devicePixelRatio`.
 *
 * Map from @vueuse/core `useDevicePixelRatio`
 * (`source/vueuse/packages/core/useDevicePixelRatio/`), which keeps a
 * `shallowRef(1)` updated by a `watchImmediate` over a `useMediaQuery('(resolution: N dppx)')` —
 * when the resolution media query stops matching, the real `window.devicePixelRatio` is read into
 * the ref, which re-writes the query string so it always targets the current resolution.
 *
 * React divergences:
 * - SSR renders the `1` initial value (matching upstream's `shallowRef(1)`) without touching
 * `window`; the real value is read on mount;
 * - upstream's `stop` handle becomes a plain `stop` callback that removes
 *   the current `matchMedia` listener and stops future re-subscriptions
 *   (effect cleanup still runs on unmount);
 * - when a window exists but `matchMedia` is unavailable, the real
 *   `window.devicePixelRatio` is still read once (upstream's `watchImmediate`
 *   reads it before the media query is involved) and then freezes.
 *
 * @example
 * const { pixelRatio } = useDevicePixelRatio()
 */
export function useDevicePixelRatio(options: UseDevicePixelRatioOptions = {}): UseDevicePixelRatioReturn {
  const [pixelRatio, setPixelRatio] = useState(1)
  const stoppedRef = useRef(false)
  const removeListenerRef = useRef<(() => void) | null>(null)

  // upstream `stop: WatchStopHandle` — detach the current listener and keep
  // it detached (the `stoppedRef` guard also covers the effect re-runs that
  // would otherwise follow a `pixelRatio` state change)
  const stop = useCallback(() => {
    stoppedRef.current = true
    removeListenerRef.current?.()
    removeListenerRef.current = null
  }, [])

  useEffect(() => {
    if (stoppedRef.current)
      return

    const win = options.window ?? (typeof window === 'undefined' ? undefined : window)
    if (!win)
      return

    // upstream `watchImmediate`: sync the real ratio on every (re)subscribe.
    // This also covers the no-`matchMedia` edge — the value is read once even
    // when the media query cannot be built (upstream reads
    // `window.devicePixelRatio` once, then freezes).
    setPixelRatio(win.devicePixelRatio)

    if (typeof win.matchMedia !== 'function')
      return

    const mediaQuery = win.matchMedia(`(resolution: ${pixelRatio}dppx)`)
    const update = () => setPixelRatio(win.devicePixelRatio)
    mediaQuery.addEventListener('change', update, { passive: true })
    removeListenerRef.current = () => mediaQuery.removeEventListener('change', update)

    return () => {
      mediaQuery.removeEventListener('change', update)
      removeListenerRef.current = null
    }
  }, [pixelRatio, options.window, stop])

  return { pixelRatio, stop }
}
