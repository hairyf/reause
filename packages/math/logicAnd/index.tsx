/**
 * `AND` condition for values — `true` only when every argument is truthy.
 *
 * Map from @vueuse/math `logicAnd`
 * (`source/vueuse/packages/math/logicAnd/`). Upstream wraps the evaluation in
 * `computed(() =>...)` and returns a `ComputedRef<boolean>`; the reause version is a pure function
 * that evaluates every plain argument and returns a plain `boolean` on each call — there is no
 * reactivity, so re-renders (or effects) drive re-evaluation (SSR-safe).
 *
 * React divergence: arguments are plain values, not upstream's `MaybeRefOrGetter<any>[]`.
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * logicAnd(true, 1, 'foo') // true
 * logicAnd(true, false) // false
 *
 * @param args - Values to test.
 * @returns `true` when every argument is truthy, `false` otherwise.
 */
export function logicAnd(...args: any[]): boolean {
  return args.every(value => value)
}
