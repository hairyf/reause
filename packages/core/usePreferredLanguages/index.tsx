import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useState } from 'react'

/**
 * Reactive Navigator Languages.
 *
 * Map from @vueuse/core `usePreferredLanguages`
 * (`source/vueuse/packages/core/usePreferredLanguages/`), which returns a
 * shallow ref of `navigator.languages` kept fresh by a `languagechange` listener. Reactive
 * preferred languages as a plain `readonly string[]`.
 *
 * React divergences:
 * - the initial `navigator.languages` sync happens in the mount effect
 *   instead of during setup, so SSR renders the upstream `['en']` fallback
 *   without touching `navigator`;
 * - `window` is a read-only option (upstream `ConfigurableWindow`) that
 *   defaults to the global `window` — substitution happens only for
 *   `undefined`, so an explicit `window: null` keeps the hook at the
 *   `['en']` fallback (upstream returns `shallowRef(['en'])` when there is
 *   no window).
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
