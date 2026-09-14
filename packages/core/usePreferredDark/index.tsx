import type { ConfigurableWindow } from '@reause/shared'
import { useMediaQuery } from '../useMediaQuery'

/**
 * Map from @vueuse/core `usePreferredDark`
 * (`source/vueuse/packages/core/usePreferredDark/`), which is a thin wrapper
 * over `useMediaQuery('(prefers-color-scheme: dark)')`. Reactive
 * [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
 * `dark` preference as a plain boolean — `true` when the user prefers a dark theme.
 *
 * React divergences:
 * - the Vue `computed<boolean>` return becomes a plain boolean state via the
 *   composed `useMediaQuery`, so components re-render on media query changes;
 * - the initial `matchMedia().matches` sync happens in `useMediaQuery`'s
 *   mount effect instead of during setup, so SSR renders the `false` default
 *   without touching `window` — the first client render may lag one frame
 *   before the real preference arrives (shared with `useMediaQuery`).
 *
 * @example
 * const isDark = usePreferredDark()
 */
export function usePreferredDark(options: ConfigurableWindow = {}): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)', options)
}
