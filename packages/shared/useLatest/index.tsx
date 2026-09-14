import { useRef } from 'react'

/**
 * React port of react-use's `useLatest`.
 *
 * Map from react-use `useLatest`
 * Returns the ref object itself, so `.current` always holds the latest `value` of the component
 * that rendered it.
 *
 * Mapping: mirrored 1:1 — the hook returns the ref container directly (`{ readonly current: T }`),
 * not* a `[ref]` tuple, because the shape is the public contract (react-use 17.x returns the ref
 * itself). React 19 rule (docs/subagent-execution.md §3.2): the container is typed explicitly as `{
 * readonly current: T }`, never cast through `MutableRefObject`.
 *
 * `ref.current = value` is assigned **during render** on purpose. That is upstream's deliberate
 * behaviour, and it is exactly what keeps the ref fresh: `useRef` hands back one stable object for
 * the lifetime of the component, so an async callback captured on an earlier render (a
 * `setTimeout`, a promise continuation, a subscription handler) that closed over that object reads
 * the value from the **latest** render when it finally runs — no dependency array or
 * re-subscription required. Assigning the value in an effect instead would leave the ref one commit
 * behind, defeating the hook.
 *
 * Note: reause exports it as a named export (upstream ships a default export); the signature and
 * the returned value are otherwise identical.
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
