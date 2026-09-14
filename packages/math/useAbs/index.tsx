/**
 * Map from @vueuse/math `useAbs`
 * (`source/vueuse/packages/math/useAbs/`).
 *
 * @see https://vueuse.org/math/useAbs/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useAbs(-23) // 23
 *
 * @param value - The number to compute the absolute value of.
 * @returns The absolute value of the value.
 */
export function useAbs(value: number): number {
  return Math.abs(value)
}
