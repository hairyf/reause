export type UseArrayFindLastReturn<T = any> = T | undefined

/**
 * Loop equivalent of `Array.prototype.findLast` — upstream ships the same fallback for runtimes
 * without the native method (e.g. node < 18); the repo targets lib ES2022, where the native method
 * is not available.
 */
function findLast<T>(
  array: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => boolean,
): T | undefined {
  for (let index = array.length - 1; index >= 0; index--) {
    if (fn(array[index], index, array))
      return array[index]
  }
  return undefined
}

/**
 * Map from @vueuse/shared `useArrayFindLast`.
 *
 * @see https://vueuse.org/shared/useArrayFindLast/
 *
 * @example
 * const [list, setList] = useState([1, -1, 2])
 * useArrayFindLast(list, val => val > 0) // 2
 * setList([1, -1, -2]) // 1 on the next render
 */
export function useArrayFindLast<T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => boolean,
): UseArrayFindLastReturn<T> {
  return findLast(list, fn)
}
