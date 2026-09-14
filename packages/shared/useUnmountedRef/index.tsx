import { useEffect, useRef } from 'react'

/**
 * Map from ahooks `useUnmountedRef`
 * (`source/ahooks/packages/hooks/src/useUnmountedRef/`).
 *
 * @example
 * const unmountedRef = useUnmountedRef()
 *
 * async function load() {
 *   const data = await fetchData()
 *   if (unmountedRef.current) return
 *   setData(data)
 * }
 *
 * @returns A ref object whose `current` is `false` while mounted and `true`
 * after the component has unmounted; keep the object and read it later.
 */
export function useUnmountedRef(): { current: boolean } {
  const unmountedRef = useRef(false)

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
    }
  }, [])

  return unmountedRef
}
