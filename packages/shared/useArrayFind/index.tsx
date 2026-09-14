export type UseArrayFindReturn<T = any> = T | undefined

/**
 * Map from @vueuse/shared `useArrayFind`.
 *
 * @see https://vueuse.org/shared/useArrayFind/
 *
 * @example
 * const [list, setList] = useState([1, -1, 2])
 * useArrayFind(list, val => val > 0) // 1
 * setList([3, -1, 2]) // 3 on the next render
 */
export function useArrayFind<T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => boolean,
): UseArrayFindReturn<T> {
  return list.find(fn)
}
