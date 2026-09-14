export type UseArrayUniqueReturn<T = any> = T[]

/**
 * Map from @vueuse/shared `useArrayUnique`.
 *
 * @see https://vueuse.org/shared/useArrayUnique/
 *
 * @example
 * const [list, setList] = useState([0, 2, 2, 4, 4, 4])
 * const result = useArrayUnique(list) // [0, 2, 4]
 *
 * setList([0, 2, 4, 6, 6]) // result === [0, 2, 4, 6] on the next render
 */
export function useArrayUnique<T>(
  list: readonly T[],
  compareFn?: (a: T, b: T, array: readonly T[]) => boolean,
): UseArrayUniqueReturn<T> {
  return compareFn ? uniqueElementsBy(list, compareFn) : uniq(list)
}

function uniq<T>(array: readonly T[]) {
  return Array.from(new Set(array))
}

function uniqueElementsBy<T>(
  array: readonly T[],
  fn: (a: T, b: T, array: readonly T[]) => boolean,
) {
  return array.reduce<T[]>((acc, v) => {
    if (!acc.some(x => fn(v, x, array)))
      acc.push(v)
    return acc
  }, [])
}
