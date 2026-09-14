import type { ConfigurableWindow } from '@reause/shared'
import { useMediaQuery } from '../useMediaQuery'

export type ReducedTransparencyType = 'reduce' | 'no-preference'

/**
 * Map from @vueuse/core `usePreferredReducedTransparency`
 * (`source/vueuse/packages/core/usePreferredReducedTransparency/`), which
 * composes `useMediaQuery('(prefers-reduced-transparency: reduce)')` and maps the matched boolean
 * to a string. Reactive
 * [prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency)
 * media query as a plain string — `'reduce'` or `'no-preference'`.
 *
 * React divergences:
 * - the Vue `computed<ReducedTransparencyType>` return becomes a plain
 *   string derived from `useMediaQuery`, so components re-render on media
 *   query changes;
 * - media query binding is delegated to `useMediaQuery` (as upstream does),
 *   which attaches the query and its `change` listener inside a
 *   self-contained `useEffect` and removes them on unmount;
 * - the initial `matchMedia().matches` sync happens in `useMediaQuery`'s mount effect instead of
 * during setup, so SSR renders the `'no-preference'` default without touching `window` (, where the
 * media query ref starts `false`).
 *
 * @example
 * const transparency = usePreferredReducedTransparency()
 */
export function usePreferredReducedTransparency(options: ConfigurableWindow = {}): ReducedTransparencyType {
  const isReduced = useMediaQuery('(prefers-reduced-transparency: reduce)', options)

  return isReduced ? 'reduce' : 'no-preference'
}
