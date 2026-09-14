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
 * Map from @vueuse/shared `useArrayFindLast`
 * Mapping: upstream wraps native `Array.prototype.findLast` (with a loop fallback for runtimes
 * without it) in `computed(() =>...)` and returns a `ComputedRef`; React has no reactive value
 * tracking, so this is a plain function recomputed on every render over the plain `list` array the
 * caller passes — the loop helper stands in for the native method since the repo targets lib
 * ES2022. Hold the array in `useState` and pass a new array to observe a change — the last match is
 * returned on the next render.
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
