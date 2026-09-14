import type { Dispatch, SetStateAction } from 'react'
import type { State } from '../useControllableState'
import { useCallback, useEffect, useRef } from 'react'
import { useControllableState } from '../useControllableState'
import { toValue } from '../utils'

export type UseStateAutoResetReturn<T = any> = [T, Dispatch<SetStateAction<T>>]

/**
 * A state which will be reset to the default value after some time.
 *
 * Map from @vueuse/shared `refAutoReset`
 * (`source/vueuse/packages/shared/refAutoReset/`). Upstream returns a single
 * writable Vue ref; per this repo's `useState*` family convention the return is the React `[value,
 * setValue]` tuple — `value` is the state, `setValue` is a `useState`-style setter (value or
 * updater form, `Dispatch<SetStateAction>`) that also (re)schedules a timer to restore
 * `defaultValue` after `afterMs` milliseconds. `defaultValue` accepts the shared `State<T>` form
 * (plain value, lazy getter, state tuple, or controlled `{ value, onChange }` pair). `afterMs` is a
 * plain number, read when the timer is scheduled (upstream: `MaybeRefOrGetter<number>`); the
 * pending timer is cleared on unmount (upstream: `tryOnScopeDispose`, timers in the effect scope).
 * The deprecated `autoResetRef` alias is not ported.
 *
 * @param defaultValue The value which will be set.
 * @param afterMs      A zero-or-greater delay in milliseconds.
 * @example
 * const [message, setMessage] = useStateAutoReset('default message', 1000)
 *
 * function handleMessage() {
 *   setMessage('message has set') // resets to 'default message' after 1000ms
 * }
 */
export function useStateAutoReset<T = any>(
  defaultValue: State<T>,
  afterMs: number = 10000,
): UseStateAutoResetReturn<T> {
  const [value, setValue] = useControllableState(defaultValue, { passive: true })

  // keep the latest arguments in refs so the reset always uses the newest
  // `defaultValue` without re-scheduling on every render
  const defaultValueRef = useRef(defaultValue)
  const afterMsRef = useRef(afterMs)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  defaultValueRef.current = defaultValue
  afterMsRef.current = afterMs

  // schedule a reset, replacing any pending one; the value to restore is
  // resolved with `toValue` when the timer fires
  const scheduleReset = useCallback(() => {
    if (timerRef.current)
      clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      // re-resolve the newest defaultValue when the timer fires
      // (upstream: `toValue(defaultValue)` at fire time)
      setValue(toValue(defaultValueRef.current))
    }, afterMsRef.current)
  }, [])

  const setValueWithReset = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setValue(next)
    scheduleReset()
  }, [scheduleReset])

  // clear a pending reset timer on unmount (upstream: `tryOnScopeDispose`)
  useEffect(() => () => {
    if (timerRef.current)
      clearTimeout(timerRef.current)
  }, [])

  return [value, setValueWithReset]
}
