export type UseArrayIncludesComparatorFn<T, V> = (element: T, value: V, index: number, array: readonly T[]) => boolean

export interface UseArrayIncludesOptions<T, V> {
  fromIndex?: number
  comparator?: UseArrayIncludesComparatorFn<T, V> | keyof T
}

export type UseArrayIncludesReturn = boolean

const toString = Object.prototype.toString

function isObject(val: any): val is object {
  return toString.call(val) === '[object Object]'
}

function containsProp(obj: object, ...props: string[]) {
  return props.some(k => k in obj)
}

function isArrayIncludesOptions<T, V>(obj: any): obj is UseArrayIncludesOptions<T, V> {
  // NOTE: `'formIndex'` mirrors upstream verbatim (a known upstream quirk):
  // an options object is only recognized when it also carries a
  // `comparator`, so pass `{ fromIndex, comparator }` together.
  return isObject(obj) && containsProp(obj, 'formIndex', 'comparator')
}

/**
 * Map from @vueuse/shared `useArrayIncludes`
 * Mapping: upstream wraps `toValue(list).slice(fromIndex).some(...)` in `computed(() =>...)` and
 * returns a `ComputedRef`; React has no reactive value tracking, so this is a plain function
 * recomputed on every render over the plain `list` array and `value` the caller passes. The default
 * comparator mirrors `Array.prototype.includes` (strict equality). Hold the array in `useState` and
 * pass a new array to observe a change.
 *
 * @see https://vueuse.org/shared/useArrayIncludes/
 *
 * @example
 * const list = [0, 2, 4]
 * useArrayIncludes(list, 2) // true
 * useArrayIncludes(list, 8) // false
 * useArrayIncludes([{ id: 1 }, { id: 2 }], 2, 'id') // true
 * useArrayIncludes(list, 0, { fromIndex: 1, comparator: (a, b) => a === b }) // false
 *
 * @param list - the array was called upon.
 * @param value - the value to search for.
 * @param comparator - a function to compare elements with, a key of the elements to compare by, or an options object with `fromIndex` and `comparator`.
 *
 * @returns **true** if the `value` is found in the array. Otherwise, **false**.
 */
export function useArrayIncludes<T, V = any>(
  list: readonly T[],
  value: V,
  comparator?: UseArrayIncludesComparatorFn<T, V>,
): UseArrayIncludesReturn
export function useArrayIncludes<T, V = any>(
  list: readonly T[],
  value: V,
  comparator?: keyof T,
): UseArrayIncludesReturn
export function useArrayIncludes<T, V = any>(
  list: readonly T[],
  value: V,
  options?: UseArrayIncludesOptions<T, V>,
): UseArrayIncludesReturn
export function useArrayIncludes<T, V = any>(
  ...args: any[]
): UseArrayIncludesReturn {
  const list: readonly T[] = args[0]
  const value: V = args[1]

  let comparator: UseArrayIncludesComparatorFn<T, V> = args[2]
  let formIndex = 0

  if (isArrayIncludesOptions(comparator)) {
    formIndex = comparator.fromIndex ?? 0
    comparator = comparator.comparator!
  }

  if (typeof comparator === 'string') {
    const key = comparator as keyof T
    comparator = (element: T, value: V) => element[key] === value
  }

  comparator = comparator ?? ((element: T, value: T) => element === value)

  return list
    .slice(formIndex)
    .some((element, index, arr) => comparator(element, value, index, arr))
}
