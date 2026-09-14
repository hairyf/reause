export type UseArrayFindReturn<T = any> = T | undefined

/**
 * Map from @vueuse/shared `useArrayFind`
 * Mapping: upstream wraps `toValue(list).find(...)` in `computed(() =>...)` and returns a
 * `ComputedRef`; React has no reactive value tracking, so this is a plain function recomputed on
 * every render over the plain `list` array the caller passes. Hold the array in `useState` and pass
 * a new array to observe a change — the first match is returned on the next render.
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
