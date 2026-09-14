export type UseArrayEveryReturn = boolean

/**
 * Map from @vueuse/shared `useArrayEvery`.
 *
 * @see https://vueuse.org/shared/useArrayEvery/
 *
 * @example
 * const [list, setList] = useState([0, 2, 4])
 * useArrayEvery(list, val => val % 2 === 0) // true
 * setList([0, 2, 5]) // false on the next render
 *
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns **true** if the `fn` function returns a **truthy** value for every element from the array. Otherwise, **false**.
 */
export function useArrayEvery<T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => unknown,
): UseArrayEveryReturn {
  return list.every(fn)
}
