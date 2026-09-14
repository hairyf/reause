export type UseArrayJoinReturn = string

/**
 * Map from @vueuse/shared `useArrayJoin`.
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
