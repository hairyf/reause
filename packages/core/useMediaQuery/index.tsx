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
 * (`source/vueuse/packages/core/useMediaQuery/`), which creates a
 * `MediaQueryList` for the query string and returns a reactive boolean (`computed`) that flips on
 * its `change` event. Reactive [Media
 * Query](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Testing_media_queries) — a
 * plain boolean, `true` while the query matches.
 *
 * React divergences:
 * - the Vue `computed<boolean>` return becomes a plain boolean state, so
 *   components re-render on media query changes;
 * - the `matchMedia` query and its `change` listener attach inside a self-contained `useEffect`
 * (upstream binds through `useEventListener`);
 * - `query` is a read-only value source and takes a plain `string` and the media query re-binds
 * when it changes;
 * - `window` is a read-only value source (`ConfigurableWindow`) that defaults
 *   to the global `window` (upstream's `defaultWindow`); pass `window: null`
 *   to force the `ssrWidth` fallback;
 * - the upstream `ssrSupport` branch (a numeric `ssrWidth` fallback that approximates the query
 * from a simulated viewport width) is resolved synchronously during render with no `window` access,
 * so the server markup and the first client render both carry the simulated match; once
 * `matchMedia` is available the mount effect replaces it with the real result;
 * - `ssrWidth` comes from the per-hook `ssrWidth` option or, when that is
 *   omitted, from the closest `SSRWidthProvider` above the caller (read
 *   through `useSSRWidth()`, upstream's `provideSSRWidth`). The per-hook
 *   option takes precedence over the provided width, exactly like upstream's
 *   `const { ssrWidth = useSSRWidth() } = options`. Without a provider and
 *   without the option the hook keeps its plain client behaviour — `false`
 *   until `matchMedia` answers — and never throws, so `undefined` can never
 *   reach the returned boolean.
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
