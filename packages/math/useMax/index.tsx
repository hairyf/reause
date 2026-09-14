import { toArgsFlat } from '../utils'

/**
 * Map from @vueuse/math `useMax`
 * (`source/vueuse/packages/math/useMax/`). Reactively get maximum of values.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<number>`; the reause version is a pure derived hook — the plain numbers (variadic
 * arguments or a single `readonly number[]`) are read at render time and the maximum is returned
 * directly as a `number`, with no `.value` wrapper (SSR-safe).
 *
 * React divergence: arguments are plain read-only numbers, not upstream's
 * `MaybeRefOrGetter<number>[]`. The caller re-renders with new values (e.g. from `useState`) and
 * the hook recomputes.
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
