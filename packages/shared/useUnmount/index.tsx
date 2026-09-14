import { useEffect, useRef } from 'react'

/**
 * React port of react-use's `useUnmount`.
 *
 * Map from react-use `useUnmount`
 * Mapping: react-use's `useUnmount` keeps the callback in a `useRef`, reassigning it on every
 * render so the newest callback is invoked, and runs it via an empty-dependency `useEffect` cleanup
 * (react-use's `useEffectOnce` is just `useEffect(effect, [])`). This port follows the same
 * semantics.
 *
 * @example
 * useUnmount(() => cleanup())
 */
export function useUnmount(fn: () => any): void {
  const fnRef = useRef(fn)

  // update the ref each render so if it change the newest callback will be invoked
  fnRef.current = fn

  useEffect(() => () => fnRef.current(), [])
}
