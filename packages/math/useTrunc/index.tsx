/**
 * Map from @vueuse/math `useTrunc`
 * (`source/vueuse/packages/math/useTrunc/`).
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
