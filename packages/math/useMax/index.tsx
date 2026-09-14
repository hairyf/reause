import { toArgsFlat } from '../utils'

/**
 * Map from @vueuse/math `useMax`
 * (`source/vueuse/packages/math/useMax/`).
 *
 * @see https://vueuse.org/math/useMax/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const array = [1, 2, 3, 4]
 * const max = useMax(array) // 4
 *
 * const max2 = useMax(1, 3, 2) // 3
 *
 * @param array - An array of values.
 * @returns The maximum of the given values (`Number.NEGATIVE_INFINITY` when
 * called with no arguments).
 */
export function useMax(array: readonly number[]): number
export function useMax(...args: number[]): number
export function useMax(...args: readonly (number | readonly number[])[]): number {
  return Math.max(...toArgsFlat(args))
}
