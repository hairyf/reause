import type { EffectCallback } from 'react'
import { useEffect } from 'react'

/**
 * Map from react-use `useEffectOnce` (upstream file `source/react-use/src/useEffectOnce.ts`).
 *
 * @example
 * useEffectOnce(() => {
 *   const subscription = source.subscribe()
 *   return () => subscription.unsubscribe()
 * })
 */
export function useEffectOnce(effect: EffectCallback): void {
  useEffect(effect, [])
}
