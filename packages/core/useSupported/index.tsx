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
 * (`source/vueuse/packages/core/useSupported/`). SSR compatibility
 * `isSupported` — `true` when the feature probed by `callback` is supported by the current browser.
 *
 * React divergences:
 * - the Vue `ComputedRef<boolean>` return becomes a plain boolean state;
 * - upstream composes `useMounted` and re-evaluates its `computed` when the
 *   mounted state flips; here the callback runs once in a mount `useEffect`
 *   — React has no reactive dependency tracking, so the result is evaluated
 *   exactly once on mount and never re-evaluated;
 * - the callback is never invoked during render or on the server
 *   (SSR-safe): the value stays `false` until the mount effect runs.
 *   Upstream's computed evaluates `Boolean(callback())` on every read — also
 *   before `useMounted` flips and on the server — so its pre-mount value is
 *   whatever the callback returns in that environment, not `false`. The
 *   first client-side render can therefore disagree with upstream's
 *   server-rendered value; reause deliberately waits for the mount effect.
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
