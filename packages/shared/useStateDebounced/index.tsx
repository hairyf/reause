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
 * Debounce updates of a state value — React port of VueUse's `refDebounced`.
 *
 * Map from @vueuse/shared `refDebounced`
 * Mapping: upstream takes a Vue `Ref<T>` and returns a readonly ref that only flips to the latest
 * source value once it stops changing for `ms` (a watcher hands every change to `useDebounceFn`).
 * The naming follows this repo's `ref* → useState*` rule (`refDebounced` → `useStateDebounced`),
 * the Vue `Ref<T>` input becomes a plain initial value, and the readonly ref becomes an extra state
 * slot — so the hook returns the tuple `[value, setValue, debounced]`:
 *
 * ```ts
 * const [input, setInput, debounced] = useStateDebounced('foo', 1000)
 *
 * setInput('bar')
 * console.log(debounced) // 'foo' — flips to 'bar' once the debounce elapses
 * ```
 *
 * `value` is the source state, `setValue` its setter, and `debounced` lags behind it by `ms`.
 * Writes settle through a `useDebounceFn` updater, so a burst of writes collapses into a single
 * trailing update carrying the last written value. `ms` (and `options.maxWait`) are plain numbers,
 * read on every write; pending timers are cleared when the component unmounts (upstream disposes
 * with the effect scope). Note: a write only schedules the debounce when the value actually changes
 * — writing the same value is skipped by `useControllableState`'s `Object.is` guard, so the pending
 * timer is not re-delayed (upstream's `watch` re-delays on every source write, even unchanged
 * ones).
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
