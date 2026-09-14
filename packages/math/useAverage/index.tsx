import { toArgsFlat } from '../utils'

/**
 * Map from @vueuse/math `useAverage`
 * (`source/vueuse/packages/math/useAverage/`).
 *
 * @see https://vueuse.org/math/useAverage/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const array = [1, 2, 3, 4]
 * const average = useAverage(array) // 2.5
 *
 * const average2 = useAverage(1, 3, 2) // 2
 *
 * @param array - An array of numbers.
 * @returns The average of the given numbers (`0` when called with no arguments).
 */
export function useAverage(array: readonly number[]): number
export function useAverage(...args: number[]): number
export function useAverage(...args: readonly (number | readonly number[])[]): number {
  const values = toArgsFlat(args)
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length
}
