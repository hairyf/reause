import { toArgsFlat } from '../utils'

/**
 * Map from @vueuse/math `useMin`
 * (`source/vueuse/packages/math/useMin/`). Reactively calculate the minimum of
 * the given numbers — the React analog of reactive `Math.min`.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<number>`; the reause version is a pure derived hook — the plain numbers (variadic
 * arguments or a single `readonly number[]`) are read at render time and the minimum is returned
 * directly, with no effects and no `.value` wrapper (SSR-safe).
 *
 * React divergence: arguments are plain read-only numbers, not upstream's
 * `MaybeRefOrGetter<number>[]`. The caller re-renders with new values (e.g. from `useState`) and
 * the hook recomputes.
 *
 * @see https://vueuse.org/math/useMin/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const array = [1, 2, 3, 4]
 * const min = useMin(array) // 1
 *
 * const min2 = useMin(1, 3, 2) // 1
 *
 * @param array - A set of numbers to find the minimum of.
 * @returns The minimum of the given numbers, or `Number.POSITIVE_INFINITY` when
 * no arguments are passed (matching `Math.min()` semantics).
 */
export function useMin(array: readonly number[]): number
export function useMin(...args: number[]): number
export function useMin(...args: readonly (number | readonly number[])[]): number {
  return Math.min(...toArgsFlat(args))
}
