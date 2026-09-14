import type { ConfigurableWindow } from '@reause/shared'
import { pxValue } from '@reause/shared'
import { useEffect, useState } from 'react'
import { useSSRWidth } from '../useSSRWidth'

/**
 * Resolve a media query against a simulated viewport width, mirroring the upstream `ssrSupport`
 * branch. Pure: it never reads `window`, so it is safe to call while rendering on the server.
 */
function resolveSsrMatches(query: string, ssrWidth: number): boolean {
  const queryStrings = query.split(',')
  return queryStrings.some((queryString) => {
    const not = queryString.includes('not all')
    const minWidth = queryString.match(/\(\s*min-width:\s*(-?\d+(?:\.\d*)?[a-z]+\s*)\)/)
    const maxWidth = queryString.match(/\(\s*max-width:\s*(-?\d+(?:\.\d*)?[a-z]+\s*)\)/)
    let res = Boolean(minWidth || maxWidth)
    if (minWidth && res)
      res = ssrWidth >= pxValue(minWidth[1])
    if (maxWidth && res)
      res = ssrWidth <= pxValue(maxWidth[1])
    return not ? !res : res
  })
}

/**
 * Map from @vueuse/core `useMediaQuery`
 * (`source/vueuse/packages/core/useMediaQuery/`).
 *
 * @example
 * const isLargeScreen = useMediaQuery('(min-width: 1024px)')
 * const isPreferredDark = useMediaQuery('(prefers-color-scheme: dark)')
 */
export function useMediaQuery(
  query: string,
  options: ConfigurableWindow & { ssrWidth?: number } = {},
): boolean {
  const { window: windowOption, ssrWidth: ssrWidthOption } = options

  // The per-hook option wins over the globally provided width (upstream:
  // `const { ssrWidth = useSSRWidth() } = options`); with neither, `ssrWidth`
  // stays `undefined` and the hook falls back to its client-only behaviour.
  const [providedWidth] = useSSRWidth()
  const ssrWidth = ssrWidthOption ?? providedWidth

  // SSR and the first client render: resolve `ssrWidth` synchronously without
  // touching `window`, so server markup hydrates without a mismatch.
  const [matches, setMatches] = useState(() =>
    typeof ssrWidth === 'number' ? resolveSsrMatches(query, ssrWidth) : false,
  )

  useEffect(() => {
    const trackedWindow = windowOption === undefined
      ? (typeof window === 'undefined' ? undefined : window)
      : windowOption
    const isSupported = Boolean(
      trackedWindow
      && 'matchMedia' in trackedWindow
      && typeof trackedWindow.matchMedia === 'function',
    )

    // SSR width fallback while `matchMedia` is unavailable; on the client the
    // real `matchMedia` result wins (upstream's `ssrSupport` exit on mount)
    if (typeof ssrWidth === 'number' && !isSupported) {
      setMatches(resolveSsrMatches(query, ssrWidth))
      return
    }

    if (!isSupported || !trackedWindow)
      return

    const mediaQuery = trackedWindow.matchMedia(query)
    const update = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    setMatches(mediaQuery.matches)
    mediaQuery.addEventListener('change', update, { passive: true })

    return () => {
      mediaQuery.removeEventListener('change', update)
    }
  }, [query, windowOption, ssrWidth])

  return matches
}
