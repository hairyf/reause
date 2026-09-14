export type UseArrayFilterReturn<T = any> = T[]

/**
 * Reactive `Array.filter`
 *
 * Map from @vueuse/shared `useArrayFilter`
 *
 * Mapping: Vue's `computed` → recompute per render and return a plain array (no `.value`) over the
 * plain `list` array the caller passes. Pass a `useState` array directly — the filtered result
 * updates on the next render.
 *
 * @see https://vueuse.org/useArrayFilter
 *
 * @example
 * const [list, setList] = useState([0, 1, 2, 3, 4])
 * const evens = useArrayFilter(list, i => i % 2 === 0) // [0, 2, 4]
 * setList([1, 2, 3]) // evens === [2] on the next render
 */
export function useArrayFilter<T, S extends T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => element is S,
): UseArrayFilterReturn<S>
export function useArrayFilter<T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => unknown,
): UseArrayFilterReturn<T>
export function useArrayFilter<T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => unknown,
): UseArrayFilterReturn<T> {
  return list.filter(fn)
}
