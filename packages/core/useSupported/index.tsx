import { useEffect, useState } from 'react'

/**
 * Return type of `useSupported` — a plain boolean state.
 *
 * Upstream's alias is `ComputedRef<boolean>`; React has no computed refs, so the compliant port
 * returns the plain `boolean` the hook holds.
 */
export type UseSupportedReturn = boolean

/**
 * Map from @vueuse/core `useSupported`
 * (`source/vueuse/packages/core/useSupported/`).
 *
 * @example
 * const isSupported = useSupported(() => navigator && 'getBattery' in navigator)
 */
export function useSupported(callback: () => unknown): UseSupportedReturn {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(Boolean(callback()))
  }, [])

  return isSupported
}
