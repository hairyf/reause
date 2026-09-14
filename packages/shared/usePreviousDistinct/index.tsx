import { useRef } from 'react'
import { useIsFirstRender } from '../useIsFirstRender'

/**
 * Tells `usePreviousDistinct` whether two values count as the same one.
 *
 * `prev` is the last value the hook accepted as *distinct* — not necessarily the value it returned,
 * and `undefined` before the first change — and `next` is the value the component is rendering with
 * now. Returning `true` means "these are equivalent": the incoming value becomes the tracked one
 * without displacing the value the hook reports, so no new "previous" value is recorded. Returning
 * `false` commits the change.
 *
 * Upstream react-use exports this exact type from
 * `source/react-use/src/usePreviousDistinct.ts`, and reause keeps its name,
 * shape and parameter order unchanged (AGENTS.md §1.1, React source ⇒ direct mirror).
 */
export type Predicate<T> = (prev: T | undefined, next: T) => boolean

function strictEquals<T>(prev: T | undefined, next: T): boolean {
  return prev === next
}

/**
 * Map from react-use `usePreviousDistinct`
 * (`source/react-use/src/usePreviousDistinct.ts`).
 *
 * @example
 * const previous = usePreviousDistinct(count) // `undefined` until `count` changes
 * const previousRounded = usePreviousDistinct(count, (prev, next) =>
 *   Math.round(prev ?? 0) === Math.round(next))
 */
export function usePreviousDistinct<T>(value: T, compare: Predicate<T> = strictEquals): T | undefined {
  const prevRef = useRef<T | undefined>(undefined)
  const curRef = useRef<T>(value)
  const isFirstMount = useIsFirstRender()

  if (!isFirstMount && !compare(curRef.current, value)) {
    prevRef.current = curRef.current
    curRef.current = value
  }

  return prevRef.current
}
