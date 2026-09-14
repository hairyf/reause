export interface UseToNumberOptions {
  /**
   * Method to use to convert the value to a number.
   *
   * Or a custom function for the conversion.
   *
   * @default 'parseFloat'
   */
  method?: 'parseFloat' | 'parseInt' | ((value: string | number) => number)

  /**
   * The base in mathematical numeral systems passed to `parseInt`. Only works with `method:
   * 'parseInt'`
   */
  radix?: number

  /**
   * Replace NaN with zero
   *
   * @default false
   */
  nanToZero?: boolean
}

/**
 * Map from @vueuse/shared `useToNumber`.
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * useToNumber('123') // 123
 * useToNumber('0xFA', { method: 'parseInt', radix: 16 }) // 250
 */
export function useToNumber(
  value: number | string,
  options: UseToNumberOptions = {},
): number {
  const {
    method = 'parseFloat',
    radix,
    nanToZero,
  } = options

  let resolved: number | string = value
  if (typeof method === 'function')
    resolved = method(resolved)
  else if (typeof resolved === 'string')
    resolved = Number[method](resolved, radix)

  if (nanToZero && Number.isNaN(resolved))
    resolved = 0
  return resolved
}
