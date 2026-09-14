/**
 * Map from @vueuse/shared `useToString`
 * Mapping: VueUse wraps the template-literal coercion in `computed(() =>...)` and accepts a
 * `MaybeRefOrGetter`; React has no reactive value tracking, so this is a plain function returning
 * the stringified value directly.
 *
 * The `value` param is a PLAIN read-only value — pass `ref.current` or the state value. Getter
 * inputs are intentionally not supported (getters were removed repo-wide); unlike upstream, a
 * getter passed here is coerced as-is (its source text), not invoked.
 *
 * @example
 * useToString(123.345)       // '123.345'
 * useToString('hi')          // 'hi'
 * useToString({ foo: 'hi' }) // '[object Object]'
 */
export function useToString(value: unknown): string {
  return `${value}`
}
