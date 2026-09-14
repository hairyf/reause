import type { ConfigurableWindow } from '@reause/shared'
import { useEffect, useState } from 'react'

export type ContrastType = 'more' | 'less' | 'custom' | 'no-preference'

/**
 * Map from @vueuse/core `usePreferredContrast`
 * (`source/vueuse/packages/core/usePreferredContrast/`).
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
