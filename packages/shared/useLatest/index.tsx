import { useRef } from 'react'

/**
 * Map from react-use `useLatest`.
 *
 * @example
 * const latest = useLatest(value)
 *
 * // scheduled now, reads whatever `value` is when the timer fires
 * setTimeout(() => console.log(latest.current), 1000)
 *
 * @param value The value to track. Stored as-is on every render, so
 * `undefined` and other falsy values are kept faithfully.
 * @returns The ref object itself — the same identity across renders.
 * @see https://github.com/streamich/react-use/blob/master/docs/useLatest.md
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value)
  ref.current = value
  return ref
}
