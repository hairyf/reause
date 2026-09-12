import { useEffect } from 'react'

/**
 * React port of react-use's `useMount`.
 *
 * Map from react-use `useMount`.
 * Runs `fn` exactly once after the component mounts.
 *
 * Unlike `useEffectOnce` — the neighbouring react-use port, which keeps
 * upstream's `(effect: EffectCallback): void` signature — `fn` is a bare
 * `() => void`, so nothing it returns is registered with React: the cleanup a
 * mount-time effect could hand back is dropped here. Use `useEffectOnce` when
 * that cleanup must run on unmount.
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
