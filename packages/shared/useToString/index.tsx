/**
 * Map from @vueuse/shared `useToString`.
 *
 * @example
 * useToString(123.345)       // '123.345'
 * useToString('hi')          // 'hi'
 * useToString({ foo: 'hi' }) // '[object Object]'
 */
export function useToString(value: unknown): string {
  return `${value}`
}
