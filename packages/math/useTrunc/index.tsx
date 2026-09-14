/**
 * Map from @vueuse/math `useTrunc`
 * (`source/vueuse/packages/math/useTrunc/`). Reactively truncates a number,
 * removing the fractional digits toward zero.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<number>`; the reause version is a pure derived hook — the plain `number` argument is
 * read at render time and the truncated number is returned directly, with no effects and no
 * `.value` wrapper (SSR-safe).
 *
 * React divergence: `value` is a plain read-only `number`, not upstream's
 * `MaybeRefOrGetter<number>`. The caller re-renders with a new value (e.g. from `useState`) and the
 * hook recomputes.
 *
 * @see https://vueuse.org/math/useTrunc/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useTrunc(0.95) // 0
 *
 * @param value - The number to truncate.
 * @returns The truncated number.
 */
export function useTrunc(value: number): number {
  return Math.trunc(value)
}
