export type UseArrayFindIndexReturn = number

/**
 * Map from @vueuse/shared `useArrayFindIndex`.
 *
 * @example
 * const [list, setList] = useState([0, 2, 4, 6, 8])
 * useArrayFindIndex(list, i => i % 2 === 0) // 0
 *
 * setList([1, 3, 5, 7, 9]) // result === -1 on the next render
 *
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns the index of the first element in the array that passes the test. Otherwise, "-1".
 */
export function useArrayFindIndex<T>(list: T[], fn: (element: T, index: number, array: T[]) => unknown): UseArrayFindIndexReturn {
  return list.findIndex(fn)
}
