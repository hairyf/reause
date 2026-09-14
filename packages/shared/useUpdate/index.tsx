import { useReducer } from 'react'

const updateReducer = (num: number): number => (num + 1) % 1_000_000

/**
 * Map from react-use `useUpdate`.
 *
 * @example
 * const update = useUpdate()
 * update() // forces a re-render
 */
export function useUpdate(): () => void {
  const [, update] = useReducer(updateReducer, 0)
  return update
}
