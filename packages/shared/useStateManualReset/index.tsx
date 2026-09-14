import type { Dispatch, SetStateAction } from 'react'
import type { State } from '../useControllableState'
import { useCallback, useRef } from 'react'
import { useControllableState } from '../useControllableState'
import { toValue } from '../utils'

export type UseStateManualResetReturn<T> = [
  value: T,
  setValue: Dispatch<SetStateAction<T>>,
  reset: () => void,
]

/**
 * A controlled source — a `[value, setter]` tuple or a `{ value, onChange }` object. These have no
 * stored default of their own: `toValue` returns the live value, so resetting to it would be a
 * no-op. Reset therefore restores the initial argument value instead.
 */
function isControlledSource<T>(state: State<T>): boolean {
  return (
    (Array.isArray(state) && state.length === 2 && typeof state[1] === 'function')
    || (typeof state === 'object' && state !== null && !Array.isArray(state) && 'value' in state)
  )
}

/**
 * Map from @vueuse/shared `refManualReset`
 * (`source/vueuse/packages/shared/refManualReset/`). Create a state with
 * manual reset functionality — any update can be reverted back to the initial value with the
 * returned `reset` function.
 *
 * Upstream returns a writable Vue `Ref<T>` extended with a `reset` method (built on `customRef`).
 * Per this repo's naming rules the port is renamed to `useStateManualReset` and the ref becomes a
 * `[value, setValue, reset]` tuple: the second element is the plain `useState` setter (value or
 * updater form), and `reset` restores the default value.
 *
 * The state input accepts the shared `State<T>` form: a value, getter, state tuple, or controlled
 * `{ value, onChange }` object. `reset` re-reads the input on every call, so plain and getter
 * sources reset to the latest source value (matching upstream's `value = toValue(defaultValue)`);
 * tuple / `{ value, onChange }` (controlled) sources have no stored default, so they restore the
 * initial argument value.
 *
 * @example
 * const [message, setMessage, resetMessage] = useStateManualReset('default message')
 * setMessage('message has set')
 * resetMessage()
 * console.log(message) // 'default message'
 */
export function useStateManualReset<T>(value: State<T>): UseStateManualResetReturn<T> {
  // latest input re-synced each render so `reset` stays stable while reading
  // the current source value when invoked
  const valueRef = useRef(value)
  valueRef.current = value

  // the original argument value, captured once — the reset target for
  // controlled sources (which carry no stored default)
  const initialDefaultRef = useRef<T | undefined>(toValue(value))

  const [state, setState] = useControllableState(value, { passive: true })

  const reset = useCallback(() => {
    const current = valueRef.current
    setState(
      isControlledSource(current)
        ? (initialDefaultRef.current as T)
        : toValue(current),
    )
  }, [])

  return [state, setState, reset]
}
