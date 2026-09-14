import { useEffect, useState } from 'react'

/**
 * Map from @vueuse/core `useMounted`
 * (`source/vueuse/packages/core/useMounted/`).
 *
 * @example
 * const isMounted = useMounted()
 */
export function useMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}
