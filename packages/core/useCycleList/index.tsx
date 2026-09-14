import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useRef, useState } from 'react'

export interface UseCycleListOptions<T> {
  /**
   * The initial value of the state. A read-only value source — pass a plain value.
   */
  initialValue?: T

  /**
   * The default index when the current value is not found in the list.
   */
  fallbackIndex?: number

  /**
   * Custom function to get the index of the current value.
   */
  getIndexOf?: (value: T, list: T[]) => number
}

export interface UseCycleListReturn<T> {
  /** Current item. */
  state: T
  /** Index of the current item — `fallbackIndex` (default `0`) when `state` is not in `list`. */
  index: number
  /** Go to the next item (wraps around the end of the list). */
  next: (n?: number) => T
  /** Go to the previous item (wraps around the start of the list). */
  prev: (n?: number) => T
  /**
   * Go to a specific index.
   */
  go: (i: number) => T
  /**
   * Set the current item directly (value or updater form, like `setState`). React addition —
   * upstream assigns `state.value = v` on a Vue ref.
   */
  setState: Dispatch<SetStateAction<T>>
  /**
   * Set the current index directly (same as `go`, value or updater form). React addition — upstream
   * assigns `index.value = i` on a Vue computed ref.
   */
  setIndex: Dispatch<SetStateAction<number>>
}

/**
 * Map from @vueuse/core `useCycleList`
 * (`source/vueuse/packages/core/useCycleList/`). Cycle through a list of
 * items — `next`/`prev` move forward/backward wrapping around, `go` jumps to a specific index and
 * the current item is exposed as `state` with its position as `index`.
 *
 * 1. `state` and `index` are plain React values. They are writable through the returned
 * `setState`/`setIndex` setters (React additions — upstream assigns `state.value`/`index.value`
 * directly): `setIndex` is the same as `go`, while `setState` writes the item directly and `index`
 * re-derives from `getIndexOf ?? list.indexOf`. 2. `list` is a read-only value source and takes a
 * plain `T[]`. It is re-read on every render, so a new array from React state is picked up like any
 * other argument (upstream's `watch(listRef...)` only fires for a reactive ref, which this port
 * does not accept). 3. `next`/`prev`/`go` are stable callbacks that return the would-be value
 * synchronously (upstream returns the new state from the `set` helper); the state commit itself is
 * asynchronous (React `setState`).
 *
 * @example
 * const { state, next, prev, go } = useCycleList([
 *   'Dog', 'Cat', 'Lizard', 'Shark', 'Whale', 'Dolphin', 'Octopus', 'Seal',
 * ])
 *
 * state // 'Dog'
 * next() // 'Cat'
 * go(3) // 'Shark'
 */
export function useCycleList<T>(list: T[], options?: UseCycleListOptions<T>): UseCycleListReturn<T> {
  // latest-value refs synced each render so every control below is a stable
  // callback that always reads the newest list and options
  const listRef = useRef(list)
  listRef.current = list
  const optionsRef = useRef(options)
  optionsRef.current = options

  const getList = useCallback(() => listRef.current, [])
  const getOptions = useCallback(() => optionsRef.current, [])

  // upstream: shallowRef(getInitialValue())
  const [state, setState] = useState<T>(() => {
    const options = getOptions()
    return (options?.initialValue ?? getList()[0]) as T
  })

  // upstream: computed<number>({ get, set }) — derived from state + list on
  // every render; set(v) is `go`
  const computeIndex = useCallback((value: T): number => {
    const options = getOptions()
    const targetList = getList()
    let index = options?.getIndexOf
      ? options.getIndexOf(value, targetList)
      : targetList.indexOf(value)
    if (index < 0)
      index = options?.fallbackIndex ?? 0
    return index
  }, [getList, getOptions])

  const index = computeIndex(state)
  const indexRef = useRef(index)
  indexRef.current = index

  // upstream: set(i) — normalize the index modulo the list length, commit
  // the item at that position and return it
  const set = useCallback((i: number): T => {
    const targetList = getList()
    const length = targetList.length
    const normalized = (i % length + length) % length
    const value = targetList[normalized]
    setState(value)
    return value
  }, [getList])

  const shift = useCallback((delta = 1): T => set(indexRef.current + delta), [set])

  const next = useCallback((n = 1): T => shift(n), [shift])
  const prev = useCallback((n = 1): T => shift(-n), [shift])

  // upstream: index.value = v → set(v); functional updates resolve against
  // the latest rendered index
  const setIndex = useCallback((action: SetStateAction<number>) => {
    const resolved = typeof action === 'function' ? action(indexRef.current) : action
    set(resolved)
  }, [set])

  return { state, index, next, prev, go: set, setState, setIndex }
}
