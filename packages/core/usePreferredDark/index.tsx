import type { ConfigurableWindow } from '@reause/shared'
import { useMediaQuery } from '../useMediaQuery'

/**
 * Map from @vueuse/core `usePreferredDark`
 * (`source/vueuse/packages/core/usePreferredDark/`).
 *
 * @example
 * const isDark = usePreferredDark()
 */
export function usePreferredDark(options: ConfigurableWindow = {}): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)', options)
}
