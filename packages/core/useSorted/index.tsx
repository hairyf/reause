import { useMemo } from 'react'

/**
 * Compare function contract of `Array.prototype.sort`: return a negative number to place `a` before
 * `b`, a positive number to place `a` after `b`, and `0` (or `NaN`) to keep their relative order —
 * the sort is stable.
 */
export type UseSortedCompareFn<T = any> = (a: T, b: T) => number

/**
 * Sort algorithm contract. Receives the array copy to sort (the hook never passes the original
 * source) and the resolved compare function, returns the sorted array.
 */
export type UseSortedFn<T = any> = (arr: T[], compareFn: UseSortedCompareFn<T>) => T[]

/**
 * Options for `useSorted` —, which is not ported (see the hook JSDoc): writing the sorted result
 * back into the source contradicts React's immutable-update contract.
 */
export interface UseSortedOptions<T = any> {
  /**
   * sort algorithm
   */
  sortFn?: UseSortedFn<T>
  /**
   * compare function
   */
  compareFn?: UseSortedCompareFn<T>
}

const defaultSortFn: UseSortedFn<any> = (source, compareFn) => source.sort(compareFn)
const defaultCompare: UseSortedCompareFn<any> = (a, b) => a - b

/**
 * Map from @vueuse/core `useSorted`
 * (`source/vueuse/packages/core/useSorted/`).
 *
 * @example
 * const sorted = useSorted([10, 3, 5, 7, 2, 1, 8, 6, 9, 4])
 * // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] — source untouched
 *
 * const objSorted = useSorted(objArr, (a, b) => a.age - b.age)
 * const viaOptions = useSorted(objArr, { compareFn: (a, b) => a.age - b.age })
 */
export function useSorted<T = any>(source: readonly T[], compareFn?: UseSortedCompareFn<T>): T[]
export function useSorted<T = any>(source: readonly T[], options?: UseSortedOptions<T>): T[]
export function useSorted<T = any>(
  source: readonly T[],
  compareFn?: UseSortedCompareFn<T>,
  options?: Omit<UseSortedOptions<T>, 'compareFn'>,
): T[]
export function useSorted<T = any>(
  source: readonly T[],
  maybeCompareFnOrOptions?: UseSortedCompareFn<T> | UseSortedOptions<T>,
  maybeOptions?: Omit<UseSortedOptions<T>, 'compareFn'>,
): T[] {
  let compareFn: UseSortedCompareFn<T> | undefined
  let options: UseSortedOptions<T> = {}

  if (typeof maybeCompareFnOrOptions === 'function') {
    compareFn = maybeCompareFnOrOptions
    options = maybeOptions ?? {}
  }
  else {
    options = maybeCompareFnOrOptions ?? {}
  }

  const resolvedCompareFn = compareFn ?? options.compareFn ?? defaultCompare
  const { sortFn = defaultSortFn } = options

  return useMemo(
    () => sortFn([...source], resolvedCompareFn),
    [source, resolvedCompareFn, sortFn],
  )
}
