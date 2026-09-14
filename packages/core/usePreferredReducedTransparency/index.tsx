import type { ConfigurableWindow } from '@reause/shared'
import { useMediaQuery } from '../useMediaQuery'

export type ReducedTransparencyType = 'reduce' | 'no-preference'

/**
 * Map from @vueuse/core `usePreferredReducedTransparency`
 * (`source/vueuse/packages/core/usePreferredReducedTransparency/`).
 *
 * @example
 * const transparency = usePreferredReducedTransparency()
 */
export function usePreferredReducedTransparency(options: ConfigurableWindow = {}): ReducedTransparencyType {
  const isReduced = useMediaQuery('(prefers-reduced-transparency: reduce)', options)

  return isReduced ? 'reduce' : 'no-preference'
}
