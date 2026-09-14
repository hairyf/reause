/**
 * Flatten the composable arguments into a plain number array. React
 * port of VueUse's `toValueArgsFlat` (`source/vueuse/packages/math/utils.ts`), narrowed to plain
 * values because the arguments are read-only value sources.
 *
 * Shared by the variadic math hooks (`useAverage`, `useSum`, `useMax`, `useMin`) — upstream
 * centralizes this in the math package's `utils.ts`, so the reause port keeps a single copy here
 * instead of four.
 *
 * @__NO_SIDE_EFFECTS__
 */
export function toArgsFlat(args: readonly (number | readonly number[])[]): number[] {
  return args.flatMap(item => (Array.isArray(item) ? [...item] : [item as number]))
}
