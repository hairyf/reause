/**
 * Map from @vueuse/math `useCeil`
 * (`source/vueuse/packages/math/useCeil/`).
 *
 * @see https://vueuse.org/math/useCeil/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useCeil(0.95) // 1
 *
 * @param value - The number to ceil.
 * @returns The ceil of the value.
 */
export function useCeil(value: number): number {
  return Math.ceil(value)
}
