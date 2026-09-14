import type { RefObject } from 'react'
import { isRefLike } from '../utils'

export type IsDefinedReturn = boolean

/**
 * Map from @vueuse/shared `isDefined`.
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const example = useRef(Math.random() ? 'example' : undefined) // RefObject<string | undefined>
 *
 * if (isDefined(example))
 *   example.current // string — narrowed by the type guard
 *
 * @see https://vueuse.org/shared/isDefined/
 */
export function isDefined<T>(v: RefObject<T>): v is RefObject<Exclude<T, null | undefined>>
export function isDefined<T>(v: T): v is Exclude<T, null | undefined>
export function isDefined<T>(v: RefObject<T> | T): IsDefinedReturn {
  return (isRefLike(v) ? v.current : v) != null
}
