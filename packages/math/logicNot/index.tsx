/**
 * Map from @vueuse/math `logicNot`
 * (`source/vueuse/packages/math/logicNot/`).
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
