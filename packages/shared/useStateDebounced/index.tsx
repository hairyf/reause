import type { Dispatch, SetStateAction } from 'react'
import type { State } from '../useControllableState'
import type { DebounceFilterOptions } from '../useDebounceFn'
import { useEffect, useRef, useState } from 'react'
import { useControllableState } from '../useControllableState'
import { useDebounceFn } from '../useDebounceFn'

export type UseStateDebouncedReturn<T = any> = [
  value: T,
  setValue: Dispatch<SetStateAction<T>>,
  debounced: T,
]

/**
 * Map from @vueuse/shared `refDebounced`.
 *
 * @example
 * ```ts
 * const [value, setValue, debounced] = useStateDebounced('foo', 1000)
 * ```
 */
export function useStateDebounced<T>(
  value: State<T>,
  ms: number = 200,
  options: DebounceFilterOptions = {},
): UseStateDebouncedReturn<T> {
  const [state, setState] = useControllableState(value, { passive: true })
  const [debounced, setDebounced] = useState(state)

  // latest state — read when the debounced timer fires so `debounced` always
  // lands on the newest written value (upstream reads `value.value` at fire)
  const stateRef = useRef(state)
  stateRef.current = state

  // stable updater — schedules the trailing commit of the current state
  const updater = useDebounceFn(() => {
    setDebounced(stateRef.current)
  }, ms, options)

  // upstream: `watch(value, () => updater())` — not immediate, so the first
  // render leaves `debounced` at the initial value
  const isFirstRunRef = useRef(true)
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
      return
    }
    updater()
  }, [state, updater])

  return [state, setState, debounced]
}
