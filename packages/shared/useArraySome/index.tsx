export type UseArraySomeReturn = boolean

/**
 * Map from @vueuse/shared `useArraySome`.
 *
 * @see https://vueuse.org/shared/useArraySome/
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns **true** if the `fn` function returns a **truthy** value for any element from the array. Otherwise, **false**.
 *
 * @example
 * const [list, setList] = useState([0, 2, 4, 6, 8])
 * const result = useArraySome(list, i => i > 10) // false
 * setList([...list, 11]) // result === true on the next render
 */
export function useArraySome<T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => unknown,
): UseArraySomeReturn {
  return list.some(fn)
}
