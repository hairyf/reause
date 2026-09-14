import type { ConfigurableWindow } from '@reause/shared'
import { useMediaQuery } from '../useMediaQuery'

export type ReducedMotionType = 'reduce' | 'no-preference'

/**
 * Map from @vueuse/core `usePreferredReducedMotion`
 * (`source/vueuse/packages/core/usePreferredReducedMotion/`).
 *
 * @example
 * const motion = usePreferredReducedMotion()
 */
export function usePreferredReducedMotion(options: ConfigurableWindow = {}): ReducedMotionType {
  const isReduced = useMediaQuery('(prefers-reduced-motion: reduce)', options)

  return isReduced ? 'reduce' : 'no-preference'
}
