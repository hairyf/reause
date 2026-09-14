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
 * (`source/vueuse/packages/core/useOnline/`), which composes `useNetwork`
 * and returns its `isOnline` ref. Reactive online state as a plain boolean — `true` while the
 * browser reports a network connection.
 *
 * React divergences:
 * - the Vue `isOnline` ref return becomes a plain boolean state;
 * - the window `online`/`offline` listeners live in a self-contained `useEffect`;
 * - the initial `navigator.onLine` read happens in a lazy state initializer
 *   (the mount effect re-syncs it, e.g. when the `window` option changes), so
 *   the first render already reflects the real connection state instead of
 *   flashing `true`; during SSR, or when the window's navigator lacks
 *   `onLine`, it keeps upstream's `true` default.
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
