import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useRef, useState } from 'react'
import { useUnmount } from '../useUnmount'

/**
 * Map from react-use `useRafState`.
 *
 * @example
 * const [state, setRafState] = useRafState(0)
 *
 * // three calls in one frame → one re-render, state === 3
 * setRafState(1)
 * setRafState(2)
 * setRafState(3)
 */
export function useRafState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>] {
  const frame = useRef(0)
  const [state, setState] = useState(initialState)

  const setRafState = useCallback((value: S | ((prevState: S) => S)) => {
    cancelAnimationFrame(frame.current)

    frame.current = requestAnimationFrame(() => {
      setState(value)
    })
  }, [])

  useUnmount(() => {
    cancelAnimationFrame(frame.current)
  })

  return [state, setRafState]
}
