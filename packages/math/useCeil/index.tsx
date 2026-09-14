/**
 * Map from @vueuse/math `useCeil`
 * (`source/vueuse/packages/math/useCeil/`). Reactive `Math.ceil`.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<number>`; the reause version is a pure derived hook — the plain `number` argument is
 * read at render time and `Math.ceil` is applied directly, with no effects and no `.value` wrapper
 * (SSR-safe).
 *
 * React divergence: `value` is a plain read-only `number`, not upstream's
 * `MaybeRefOrGetter<number>`. The caller re-renders with a new value (e.g. from `useState`) and the
 * hook recomputes.
 *
 * @see https://vueuse.org/math/useCeil/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useCeil(0.95) // 1
 *
 * @param value - The number to ceil.
 * @returns The ceil of the value.
 */
export function useCeil(value: number): number {
  return Math.ceil(value)
}
