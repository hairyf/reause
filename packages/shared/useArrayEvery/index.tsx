export type UseArrayEveryReturn = boolean

/**
 * Map from @vueuse/shared `useArrayEvery`
 * Mapping: upstream wraps `toValue(list).every(...)` in `computed(() =>...)` and returns a
 * `ComputedRef`; React has no reactive value tracking, so this is a plain function recomputed on
 * every render over the plain `list` array the caller passes. Hold the array in `useState` (or any
 * render-scoped value) and pass a new array to observe a change — the result recomputes on the next
 * render. The predicate may return any value (coerced by truthiness, like `Array.prototype.every`).
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
