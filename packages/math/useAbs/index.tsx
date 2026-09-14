/**
 * Map from @vueuse/math `useAbs`
 * (`source/vueuse/packages/math/useAbs/`). Reactive `Math.abs`.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<number>`; the reause version is a pure derived hook — the plain `number` argument is
 * read at render time and `Math.abs` is applied directly, with no effects and no `.value` wrapper
 * (SSR-safe).
 *
 * React divergence: `value` is a plain read-only `number`, not upstream's
 * `MaybeRefOrGetter<number>`. The caller re-renders with a new value (e.g. from `useState`) and the
 * hook recomputes.
 *
 * @see https://vueuse.org/math/useAbs/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useAbs(-23) // 23
 *
 * @param value - The number to compute the absolute value of.
 * @returns The absolute value of the value.
 */
export function useAbs(value: number): number {
  return Math.abs(value)
}
