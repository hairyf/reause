import type { DependencyList, EffectCallback } from 'react'
import { useEffect, useRef } from 'react'
import { deepEqual } from '../useWatchDeep'

/** `false` for anything primitives box into `Object(...)` — mirrors upstream's helper. */
function isPrimitive(val: any): boolean {
  return val !== Object(val)
}

/**
 * Map from react-use `useDeepCompareEffect` (upstream file `source/react-use/src/useDeepCompareEffect.ts`).
 *
 * @example
 * useDeepCompareEffect(() => {
 *   // `options` is rebuilt on every render; this runs only when it deep-changes
 *   return () => console.log('cleanup')
 * }, [options])
 */
export function useDeepCompareEffect(effect: EffectCallback, deps: DependencyList): void {
  // eslint-disable-next-line node/prefer-global/process -- browser package: `node:process` is not bundled; the gate relies on the bundler replacing `process.env.NODE_ENV` with a literal at build time (the assumption React's own source makes) and this repo configures no `process` shim, so the replacement is what keeps the reference safe AND keeps the warnings live in a browser dev build
  if (process.env.NODE_ENV !== 'production') {
    if (!(Array.isArray(deps)) || !deps.length) {
      console.warn(
        '`useDeepCompareEffect` should not be used with no dependencies. Use React.useEffect instead.',
      )
    }

    if (deps.every(isPrimitive)) {
      console.warn(
        '`useDeepCompareEffect` should not be used with dependencies that are all primitive values. Use React.useEffect instead.',
      )
    }
  }

  const ref = useRef<DependencyList | undefined>(undefined)

  if (!ref.current || !deepEqual(deps, ref.current)) {
    ref.current = deps
  }

  useEffect(effect, ref.current)
}
