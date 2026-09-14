/**
 * Map from @vueuse/math `useFloor`
 * (`source/vueuse/packages/math/useFloor/`). Reactive `Math.floor`.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<number>`; the reause version is a pure derived hook — the plain `number` argument is
 * read at render time and `Math.floor` is applied directly, with no effects and no `.value` wrapper
 * (SSR-safe).
 *
 * React divergence: `value` is a plain read-only `number`, not upstream's
 * `MaybeRefOrGetter<number>`. The caller re-renders with a new value (e.g. from `useState`) and the
 * hook recomputes.
 *
 * @see https://vueuse.org/math/useFloor/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useFloor(45.95) // 45
 *
 * @param value - The number to floor.
 * @returns The floor of the value.
 */
export function useFloor(value: number): number {
  return Math.floor(value)
}
