/**
 * Map from @vueuse/math `useRound`
 * (`source/vueuse/packages/math/useRound/`). Reactive `Math.round`.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<number>`; the reause version is a pure derived hook — the plain `number` argument is
 * read at render time and `Math.round` is applied directly, with no effects and no `.value` wrapper
 * (SSR-safe).
 *
 * React divergence: `value` is a plain read-only `number`, not upstream's
 * `MaybeRefOrGetter<number>`. The caller re-renders with a new value (e.g. from `useState`) and the
 * hook recomputes.
 *
 * @see https://vueuse.org/math/useRound/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useRound(20.49) // 20
 *
 * @param value - The number to round.
 * @returns The value rounded to the nearest integer.
 */
export function useRound(value: number): number {
  return Math.round(value)
}
