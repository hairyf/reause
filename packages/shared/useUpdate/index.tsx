import { useReducer } from 'react'

const updateReducer = (num: number): number => (num + 1) % 1_000_000

/**
 * React port of react-use's `useUpdate`.
 *
 * Map from react-use `useUpdate`
 * Mapping: `useReducer` with a wrapping counter — the returned function dispatches an update that
 * forces a re-render and is stable across renders.
 *
 * @example
 * const update = useUpdate()
 * update() // forces a re-render
 */
export function useUpdate(): () => void {
  const [, update] = useReducer(updateReducer, 0)
  return update
}
