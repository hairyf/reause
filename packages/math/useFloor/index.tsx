/**
 * Map from @vueuse/math `useFloor`
 * (`source/vueuse/packages/math/useFloor/`).
 *
 * @see https://vueuse.org/math/useFloor/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useFloor(45.95) // 45
 *
 * @param value - The number to floor.
 * @returns The floor of the value.
 */
export function useFloor(value: number): number {
  return Math.floor(value)
}
