import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useState } from 'react'

export type ContrastType = 'more' | 'less' | 'custom' | 'no-preference'

/**
 * Map from @vueuse/core `usePreferredContrast`
 * (`source/vueuse/packages/core/usePreferredContrast/`), which composes
 * three `useMediaQuery` queries — `(prefers-contrast: more)`, `(prefers-contrast: less)` and
 * `(prefers-contrast: custom)` — and maps them through `computed` to a `ContrastType` string.
 * Reactive
 * [prefers-contrast](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast)
 * media query as a plain string — `'more'`, `'less'`, `'custom'` or `'no-preference'`.
 *
 * React divergences:
 * - the Vue `computed<ContrastType>` return becomes a plain string derived
 *   from three `useState` flags, so components re-render on media query
 *   changes;
 * - the three `matchMedia` queries and their `change` listeners attach inside a single
 * self-contained `useEffect` (upstream binds each query through `useMediaQuery` +
 * `useEventListener` with `{ passive: true }`) and all of them;
 * - the initial `matchMedia().matches` sync happens in the mount effect instead of during setup, so
 * SSR renders the `'no-preference'` default without touching `window` (, where the media query refs
 * start `false`).
 *
 * @example
 * const contrast = usePreferredContrast()
 */
export function usePreferredContrast(options: ConfigurableWindow = {}): ContrastType {
  const [isMore, setIsMore] = useState(false)
  const [isLess, setIsLess] = useState(false)
  const [isCustom, setIsCustom] = useState(false)

  useEffect(() => {
    const win = options.window ?? (typeof window === 'undefined' ? undefined : window)
    if (!win || typeof win.matchMedia !== 'function')
      return

    // mirror upstream: one `matchMedia` query per variant, resolved in
    // priority order (more > less > custom), each bound with its own
    // `change` listener
    const mediaQueries = [
      { mql: win.matchMedia('(prefers-contrast: more)'), set: setIsMore },
      { mql: win.matchMedia('(prefers-contrast: less)'), set: setIsLess },
      { mql: win.matchMedia('(prefers-contrast: custom)'), set: setIsCustom },
    ]

    const disposers = mediaQueries.map(({ mql, set }) => {
      set(mql.matches)
      const handler = (event: MediaQueryListEvent): void => {
        set(event.matches)
      }
      mql.addEventListener('change', handler, { passive: true })
      return () => {
        mql.removeEventListener('change', handler)
      }
    })

    return () => {
      disposers.forEach(dispose => dispose())
    }
  }, [options.window])

  return isMore ? 'more' : isLess ? 'less' : isCustom ? 'custom' : 'no-preference'
}
