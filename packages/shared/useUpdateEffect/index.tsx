import type { DependencyList, EffectCallback } from 'react'
import { useEffect } from 'react'
import { useIsFirstRender } from '../useIsFirstRender'

/**
 * Map from react-use `useUpdateEffect`.
 *
 * @example
 * useUpdateEffect(() => {
 *   console.log('count changed, but not on mount')
 * }, [count])
 */
export function useUpdateEffect(effect: EffectCallback, deps?: DependencyList): void {
  const isFirstMount = useIsFirstRender()

  useEffect(() => {
    if (!isFirstMount) {
      return effect()
    }
  }, deps)
}
