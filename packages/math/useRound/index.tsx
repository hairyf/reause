/**
 * Map from @vueuse/math `useRound`
 * (`source/vueuse/packages/math/useRound/`).
 *
 * @see https://vueuse.org/math/useRound/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useRound(20.49) // 20
 *
 * @param value - The number to round.
 * @returns The value rounded to the nearest integer.
 */
export function useRound(value: number): number {
  return Math.round(value)
}
