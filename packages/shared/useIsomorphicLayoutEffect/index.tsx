import { useEffect, useLayoutEffect } from 'react'
import { isClient } from '../utils'

/**
 * Map from react-use `useIsomorphicLayoutEffect`
 * (`source/react-use/src/useIsomorphicLayoutEffect.ts`).
 *
 * @example
 * useIsomorphicLayoutEffect(() => {
 *   // before the browser paints on the client, on the server's passive effect
 *   // timing there
 *   setHeight(boxRef.current?.getBoundingClientRect().height ?? 0)
 * }, [])
 */
export const useIsomorphicLayoutEffect = isClient ? useLayoutEffect : useEffect
