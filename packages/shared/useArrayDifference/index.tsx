export interface UseArrayDifferenceOptions {
  /**
   * Returns asymmetric difference
   *
   * @see https://en.wikipedia.org/wiki/Symmetric_difference
   * @default false
   */
  symmetric?: boolean
}

export type UseArrayDifferenceReturn<T = any> = T[]

function defaultComparator<T>(value: T, othVal: T) {
  return value === othVal
}

export function useArrayDifference<T>(
  list: readonly T[],
  values: readonly T[],
  key?: keyof T,
  options?: UseArrayDifferenceOptions,
): UseArrayDifferenceReturn<T>
export function useArrayDifference<T>(
  list: readonly T[],
  values: readonly T[],
  compareFn?: (value: T, othVal: T) => boolean,
  options?: UseArrayDifferenceOptions,
): UseArrayDifferenceReturn<T>

/**
 * Map from @vueuse/shared `useArrayDifference`.
 *
 * @see https://vueuse.org/shared/useArrayDifference/
 *
 * @example
 * const list = [{ id: 1 }, { id: 2 }, { id: 3 }]
 * useArrayDifference(list, [{ id: 3 }]) // [{ id: 1 }, { id: 2 }]
 * useArrayDifference(list, [{ id: 3 }], 'id') // diff by key
 * useArrayDifference(list, [{ id: 3 }], (a, b) => a.id === b.id, { symmetric: true })
 */
export function useArrayDifference<T>(...args: any[]): UseArrayDifferenceReturn<T> {
  const list: readonly T[] = args[0]
  const values: readonly T[] = args[1]

  let compareFn = args[2] ?? defaultComparator
  const {
    symmetric = false,
  } = args[3] ?? {}

  if (typeof compareFn === 'string') {
    const key = compareFn as keyof T
    compareFn = (value: T, othVal: T) => value[key] === othVal[key]
  }

  const diff1 = list.filter(x => values.findIndex(y => compareFn(x, y)) === -1)

  if (symmetric) {
    const diff2 = values.filter(x => list.findIndex(y => compareFn(x, y)) === -1)
    return [...diff1, ...diff2]
  }
  else {
    return diff1
  }
}
