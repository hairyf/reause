/**
 * `NOT` condition for values — the logical complement of the given value.
 *
 * Map from @vueuse/math `logicNot`
 * (`source/vueuse/packages/math/logicNot/`). Upstream wraps the evaluation in
 * `computed(() =>...)` and returns a `ComputedRef<boolean>`; the reause version is a pure function
 * that evaluates the plain argument and returns a plain `boolean` on each call — there is no
 * reactivity, so re-renders (or effects) drive re-evaluation (SSR-safe).
 *
 * React divergence: the argument is a plain value, not upstream's `MaybeRefOrGetter<any>`.
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * logicNot(true) // false
 * logicNot(0) // true
 * logicNot('foo') // false
 *
 * @param v - A value to negate.
 * @returns `true` when the value is falsy, `false` otherwise.
 */
export function logicNot(v: any): boolean {
  return !v
}
