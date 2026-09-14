/**
 * `OR` conditions for values.
 *
 * Map from @vueuse/math `logicOr`
 * (`source/vueuse/packages/math/logicOr/`). Compute the logical `OR` of any
 * number of values.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<boolean>`; the reause version is a pure utility function — all plain arguments are
 * evaluated on every call and the plain boolean result is returned directly, with no effects and no
 * `.value` wrapper (SSR-safe). The caller re-invokes it to react to changing values.
 *
 * React divergence: arguments are plain values, not upstream's `MaybeRefOrGetter<any>[]`.
 *
 * @see https://vueuse.org/math/logicOr/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * logicOr(true, false) // true
 * logicOr(false, 0, '') // false
 *
 * @param args - Values to evaluate.
 * @returns `true` if any argument is truthy, `false` otherwise.
 */
export function logicOr(...args: any[]): boolean {
  return args.some(i => i)
}
