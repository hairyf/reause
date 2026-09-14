export type UseArrayReducer<PV, CV, R> = (previousValue: PV, currentValue: CV, currentIndex: number) => R

export type UseArrayReduceReturn<T = any> = T

/**
 * Reactive `Array.reduce`
 *
 * Map from @vueuse/shared `useArrayReduce`
 *
 * Mapping: upstream wraps `toValue(list).reduce(...)` in `computed(() =>...)` and returns a
 * `ComputedRef`; React has no reactive value tracking, so this is a plain function recomputed on
 * every render over the plain `list` array the caller passes. Hold the array in `useState` and pass
 * a new array to observe a change — the reduced result recomputes on the next render.
 *
 * @see https://vueuse.org/shared/useArrayReduce/
 *
 * @example
 * const [list, setList] = useState([1, 2, 3])
 * useArrayReduce(list, (prev, item) => prev + item) // 6
 * setList([4, 2, 3]) // 9 on the next render
 *
 * @param list - the array was called upon.
 * @param reducer - a "reducer" function.
 *
 * @returns the value that results from running the "reducer" callback function to completion over the entire array.
 */
export function useArrayReduce<T>(
  list: readonly T[],
  reducer: UseArrayReducer<T, T, T>,
): UseArrayReduceReturn<T>

/**
 * Reactive `Array.reduce`
 *
 * @param list - the array was called upon.
 * @param reducer - a "reducer" function.
 * @param initialValue - a value (or a React lazy-initializer function, invoked
 * per evaluation like `useState`) to be initialized the first time when the callback is called.
 *
 * @returns the value that results from running the "reducer" callback function to completion over the entire array.
 */
export function useArrayReduce<T, U>(
  list: readonly T[],
  reducer: UseArrayReducer<U, T, U>,
  initialValue: U | (() => U),
): UseArrayReduceReturn<U>

export function useArrayReduce<T>(
  list: readonly T[],
  reducer: ((...p: any[]) => any),
  ...args: any[]
): UseArrayReduceReturn<T> {
  const reduceCallback = (sum: any, value: any, index: number) => reducer(sum, value, index)

  // Depending on the behavior of reduce, undefined is also a valid initialization value,
  // and this code will distinguish the behavior between them. A function initial value
  // is a React lazy initializer (React `useState` convention) — invoked per evaluation.
  const initial = typeof args[0] === 'function' ? args[0]() : args[0]
  return (
    args.length
      ? list.reduce(reduceCallback, initial)
      : list.reduce(reduceCallback)
  ) as T
}
