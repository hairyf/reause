import { toArgsFlat } from '../utils'

/**
 * Map from @vueuse/math `useSum`
 * (`source/vueuse/packages/math/useSum/`). Reactively get the sum of values.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<number>`; the reause version is a pure derived hook — the plain numbers (variadic
 * arguments or a single `readonly number[]`) are read at render time and the sum is returned
 * directly as a `number`, with no `.value` wrapper (SSR-safe).
 *
 * React divergence: arguments are plain read-only numbers, not upstream's
 * `MaybeRefOrGetter<number>[]`. In particular, the getter form (`() => number`) is NOT accepted —
 * getters as data sources are rejected repo-wide (issue #462) — so the upstream getter test is
 * intentionally not ported. The caller re-renders with new values (e.g. from `useState`) and the
 * hook recomputes.
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
