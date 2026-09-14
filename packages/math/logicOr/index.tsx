/**
 * Map from @vueuse/math `logicOr`
 * (`source/vueuse/packages/math/logicOr/`).
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
