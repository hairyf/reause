export type UseArrayJoinReturn = string

/**
 * Map from @vueuse/shared `useArrayJoin`
 * Mapping: upstream wraps `toValue(list).map(i => toValue(i)).join(toValue(separator))` in
 * `computed(...)` and accepts a `MaybeRefOrGetter`; React has no reactive value tracking, so this
 * is a plain function that recomputes the join on every render — pass a state array and re-render
 * with new state to see the updated result. The return is a plain string, no `.value`.
 *
 * `list` holds plain values only: the elements are joined with `Array.prototype.join`, so no
 * per-element unwrap happens (upstream `toValue`s each element). A function element would be
 * stringified to its source instead of invoked.
 *
 * @example
 * const [list, setList] = useState(['foo', 0, { prop: 'val' }])
 * useArrayJoin(list) // 'foo,0,[object Object]'
 * useArrayJoin(list, '--') // 'foo--0--[object Object]'
 *
 * setList([...list, 'bar']) // result === 'foo--0--[object Object]--bar' on the next render
 *
 * @param list - the array was called upon.
 * @param separator - a string to separate each pair of adjacent elements of the array. If omitted, the array elements are separated with a comma (",").
 *
 * @returns a string with all array elements joined. If `list.length` is 0, the empty string is returned.
 */
export function useArrayJoin(list: any[], separator?: string): UseArrayJoinReturn {
  return list.join(separator)
}
