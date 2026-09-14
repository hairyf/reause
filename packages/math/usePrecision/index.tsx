import { useMemo } from 'react'

export interface UsePrecisionOptions {
  /**
   * Method to use for rounding.
   *
   * @default 'round'
   */
  math?: 'floor' | 'ceil' | 'round'
}

/**
 * Accuracy of handling numerical values.
 *
 * @param value - The value
 * @param power - The power
 * @returns The result of multiplying the value with the power
 */
function accurateMultiply(value: number, power: number): number {
  const valueStr = value.toString()

  if (value > 0 && valueStr.includes('.')) {
    const decimalPlaces = valueStr.split('.')[1].length
    const multiplier = 10 ** decimalPlaces

    return (value * multiplier * power) / multiplier
  }
  else {
    return value * power
  }
}

/**
 * Map from @vueuse/math `usePrecision`
 * (`source/vueuse/packages/math/usePrecision/`). Reactively set the precision
 * of a number.
 *
 * React divergences: upstream wraps the computation in `computed(() =>...)` and returns a
 * `ComputedRef<number>`; the reause version is a pure derived hook — the plain `value`, `digits`
 * and `options` are read at render time and the precision-adjusted number is memoized and returned
 * directly, with no effects and no `.value` wrapper (SSR-safe).
 *
 * React divergence: parameters are plain read-only values, not upstream's `MaybeRefOrGetter<...>`.
 * The caller re-renders with new values (e.g. from `useState`).
 *
 * @see https://vueuse.org/math/usePrecision/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = usePrecision(3.1415, 2) // 3.14
 *
 * const ceilResult = usePrecision(3.1415, 2, {
 *   math: 'ceil',
 * }) // 3.15
 *
 * const floorResult = usePrecision(3.1415, 3, {
 *   math: 'floor',
 * }) // 3.141
 *
 * @param value - The value to set the precision of.
 * @param digits - The number of digits to keep.
 * @param options - The rounding method to use (`round` by default).
 * @returns The value with the applied precision.
 */
export function usePrecision(
  value: number,
  digits: number,
  options?: UsePrecisionOptions,
): number {
  return useMemo(() => {
    const power = 10 ** digits
    return Math[options?.math || 'round'](accurateMultiply(value, power)) / power
  }, [value, digits, options])
}
