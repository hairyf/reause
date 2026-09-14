import { useEffect } from 'react'

/**
 * Map from react-use `useMount`.
 *
 * @example
 * useMount(() => {
 *   trackPageView()
 * })
 */
export function useMount(fn: () => void): void {
  useEffect(() => {
    fn()
  }, [])
}
