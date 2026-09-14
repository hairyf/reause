export type UseArraySomeReturn = boolean

/**
 * Map from @vueuse/shared `useArraySome`
 * Mapping: `computed(() =>...)` → recompute on every render — the result is a plain `boolean` (no
 * `.value`, no caching) computed from the plain `list` array the caller passes. Hold the array in
 * `useState` and pass a new array to observe a change; the result recomputes on the next render.
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
