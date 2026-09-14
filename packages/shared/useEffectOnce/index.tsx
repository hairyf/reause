import type { EffectCallback } from 'react'
import { useEffect } from 'react'

/**
 * React port of react-use's `useEffectOnce`.
 *
 * Map from react-use `useEffectOnce` (upstream file
 * `source/react-use/src/useEffectOnce.ts`): the whole implementation is
 * `useEffect(effect, [])`, mirrored verbatim — no ref, no first-mount flag, no extra guard.
 * Equivalent to `useEffect(fn, [])`.
 *
 * Mapping: the signature stays exactly upstream's `useEffectOnce(effect: EffectCallback): void`,
 * **not** `(fn: () => void)`, because the return value is the reason this hook exists next to
 * `useMount`: the cleanup the effect returns is forwarded to React, which calls it on unmount.
 * `useMount` takes a bare `() => void` and drops whatever it returns.
 *
 * Upstream ships this hook as a default export; reause exposes it as a named export (repo
 * convention) with the same function and signature.
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
