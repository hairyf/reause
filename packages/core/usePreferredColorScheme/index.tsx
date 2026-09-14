import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useLayoutEffect, useState } from 'react'

export type ColorSchemeType = 'dark' | 'light' | 'no-preference'

// The initial `matchMedia().matches` read must happen before paint on the
// client (a `useEffect` would flash one `'no-preference'` frame) while
// staying inert on the server (where `useLayoutEffect` is a no-op and would
// only warn) — this is the isomorphic variant.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Map from @vueuse/core `usePreferredColorScheme`
 * (`source/vueuse/packages/core/usePreferredColorScheme/`).
 *
 * @example
 * const colorScheme = usePreferredColorScheme() // 'dark' | 'light' | 'no-preference'
 */
export function usePreferredColorScheme(options: ConfigurableWindow = {}): ColorSchemeType {
  const [isLight, setIsLight] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useIsomorphicLayoutEffect(() => {
    const win = options.window ?? (typeof window === 'undefined' ? undefined : window)
    if (!win || typeof win.matchMedia !== 'function')
      return

    const lightQuery = win.matchMedia('(prefers-color-scheme: light)')
    const darkQuery = win.matchMedia('(prefers-color-scheme: dark)')
    const updateLight = (event: MediaQueryListEvent) => setIsLight(event.matches)
    const updateDark = (event: MediaQueryListEvent) => setIsDark(event.matches)

    setIsLight(lightQuery.matches)
    setIsDark(darkQuery.matches)

    lightQuery.addEventListener('change', updateLight, { passive: true })
    darkQuery.addEventListener('change', updateDark, { passive: true })

    return () => {
      lightQuery.removeEventListener('change', updateLight)
      darkQuery.removeEventListener('change', updateDark)
    }
  }, [options.window])

  if (isDark)
    return 'dark'
  if (isLight)
    return 'light'
  return 'no-preference'
}
