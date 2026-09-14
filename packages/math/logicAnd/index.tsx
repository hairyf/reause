/**
 * Map from @vueuse/math `logicAnd`
 * (`source/vueuse/packages/math/logicAnd/`).
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
