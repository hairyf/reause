import { toArgsFlat } from '../utils'

/**
 * Map from @vueuse/math `useAverage`
 * (`source/vueuse/packages/math/useAverage/`). Reactively get the average of values.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<number>`; the reause version is a pure derived hook — the plain numbers (variadic
 * arguments or a single `readonly number[]`) are read at render time and the average is returned
 * directly as a `number`, with no `.value` wrapper (SSR-safe).
 *
 * React divergence: arguments are plain read-only numbers, not upstream's
 * `MaybeRefOrGetter<number>[]`. The caller re-renders with new values (e.g. from `useState`) and
 * the hook recomputes.
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
