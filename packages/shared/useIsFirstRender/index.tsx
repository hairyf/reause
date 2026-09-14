import { useRef } from 'react'

/**
 * Map from @mantine/hooks `useIsFirstRender`
 * (`source/mantine/packages/@mantine/hooks/src/use-is-first-render/`).
 *
 * @example
 * const isFirstRender = useIsFirstRender()
 *
 * useEffect(() => {
 *   // skip the mount render, then react to every dependency change
 *   if (!isFirstRender)
 *     refetch()
 * }, [deps])
 */
export function useIsFirstRender(): boolean {
  const renderRef = useRef(true)

  if (renderRef.current === true) {
    renderRef.current = false
    return true
  }

  return renderRef.current
}
