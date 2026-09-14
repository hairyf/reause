import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useState } from 'react'
import { useUnmountedRef } from '../useUnmountedRef'

/**
 * Map from ahooks `useSafeState`
 * (`source/ahooks/packages/hooks/src/useSafeState/`).
 *
 * @example
 * const [value, setValue] = useSafeState(0)
 *
 * async function load() {
 *   const data = await fetchData()
 *   // ignored once the component has unmounted
 *   setValue(data)
 * }
 *
 * @example
 * const [count, setCount] = useSafeState(0)
 * setCount(previous => previous + 1)
 *
 * @param initialState Either the initial value or a lazy factory for it; both
 * forms are handed straight to `useState`.
 * @returns A tuple of the current state and a referentially stable setter that
 * is a no-op once the component has unmounted.
 */
export function useSafeState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>]

export function useSafeState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>]

export function useSafeState<S>(initialState?: S | (() => S)) {
  const unmountedRef = useUnmountedRef()
  const [state, setState] = useState(initialState)

  const setSafeState = useCallback((nextState: S) => {
    /** if component is unmounted, stop update */
    if (unmountedRef.current)
      return

    setState(nextState)
  }, [])

  return [state, setSafeState] as const
}
