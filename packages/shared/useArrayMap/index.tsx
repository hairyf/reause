export type UseArrayMapReturn<T = any> = T[]

/**
 * Map from @vueuse/shared `useArrayMap`.
 *
 * @example
 * const [list, setList] = useState([0, 1, 2, 3, 4])
 * const result = useArrayMap(list, i => i * 2) // [0, 2, 4, 6, 8]
 * setList(list.slice(0, -1)) // result: [0, 2, 4, 6] on the next render
 */
export function useArrayMap<T, U = T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => U,
): UseArrayMapReturn<U> {
  return list.map(fn)
}
