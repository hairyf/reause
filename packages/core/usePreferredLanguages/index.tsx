import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useState } from 'react'

/**
 * Map from @vueuse/core `usePreferredLanguages`
 * (`source/vueuse/packages/core/usePreferredLanguages/`).
 *
 * @see https://vueuse.org/core/usePreferredLanguages/
 * @param options
 *
 * @example
 * const languages = usePreferredLanguages()
 */
export function usePreferredLanguages(options: ConfigurableWindow = {}): readonly string[] {
  const [languages, setLanguages] = useState<readonly string[]>(() => ['en'])

  useEffect(() => {
    // default substitution only for `undefined` — an explicit `window: null`
    // keeps the hook inert at the `['en']` fallback
    const win = options.window === undefined
      ? (typeof window === 'undefined' ? undefined : window)
      : options.window
    if (!win)
      return

    setLanguages(win.navigator.languages)

    const sync = () => setLanguages(win.navigator.languages)
    win.addEventListener('languagechange', sync, { passive: true })

    return () => {
      win.removeEventListener('languagechange', sync)
    }
  }, [options.window])

  return languages
}
