import { toArgsFlat } from '../utils'

/**
 * Map from @vueuse/math `useSum`
 * (`source/vueuse/packages/math/useSum/`).
 *
 * @see https://vueuse.org/math/useSum/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const array = [1, 2, 3, 4]
 * const sum = useSum(array) // 10
 *
 * const [a, setA] = useState(1)
 * const [b, setB] = useState(3)
 * const sum2 = useSum(a, b, 2) // 6
 *
 * @param array - An array of numbers.
 * @returns The sum of the given numbers (`0` when called with no arguments).
 */
export function useSum(array: readonly number[]): number
export function useSum(...args: number[]): number
export function useSum(...args: readonly (number | readonly number[])[]): number {
  return toArgsFlat(args).reduce((sum, v) => sum + v, 0)
}
