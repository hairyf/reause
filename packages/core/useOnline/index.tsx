import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useState } from 'react'

/**
 * Reads the online state from a window, keeping upstream's `true` fallback when the window or its
 * navigator does not expose `onLine` (upstream `useNetwork` only assigns `navigator.onLine` when
 * `navigator` exists).
 */
function resolveOnline(win: Window | undefined): boolean {
  const nav = win?.navigator
  if (!nav || !('onLine' in nav))
    return true
  return nav.onLine
}

/**
 * Map from @vueuse/core `useOnline`
 * (`source/vueuse/packages/core/useOnline/`).
 *
 * @example
 * const online = useOnline()
 */
export function useOnline(options: ConfigurableWindow = {}): boolean {
  const [online, setOnline] = useState(() =>
    resolveOnline(options.window ?? (typeof window === 'undefined' ? undefined : window)))

  useEffect(() => {
    const win = options.window ?? (typeof window === 'undefined' ? undefined : window)
    if (!win)
      return

    setOnline(resolveOnline(win))

    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    win.addEventListener('online', goOnline, { passive: true })
    win.addEventListener('offline', goOffline, { passive: true })

    return () => {
      win.removeEventListener('online', goOnline)
      win.removeEventListener('offline', goOffline)
    }
  }, [options.window])

  return online
}
