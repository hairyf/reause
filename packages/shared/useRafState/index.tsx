import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useRef, useState } from 'react'
import { useUnmount } from '../useUnmount'

/**
 * React port of react-use's `useRafState`.
 *
 * Map from react-use `useRafState`
 * Mapping: mirrors upstream as-is — the frame handle lives in a `useRef`, and
 * `setRafState` is a `useCallback(…, [])` that **cancels the previously
 * scheduled frame** before requesting a new one, so any number of calls inside
 * one frame collapses into a single commit that carries the last scheduled
 * `value`. That coalescing is the entire contract of the hook. `value` is
 * forwarded to `setState` unchanged from inside the frame callback, so the
 * updater form (`setRafState(prev => prev + 1)`) is a React functional update
 * that sees the state committed by the previous frame; since each new call
 * cancels the frame scheduled before it, two updater calls before a frame runs
 * apply the updater **once** — upstream's semantics, the superseded callback
 * never reaches `setState`. The pending frame is cancelled on unmount through
 * `@reause/shared`'s `useUnmount` (upstream uses react-use's own `useUnmount`),
 * and the initial state may be a lazy factory because it is passed straight to
 * `useState`. Upstream ships this hook as a default export; reause exports it
 * by name.
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
