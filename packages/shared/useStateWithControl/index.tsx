import type { Dispatch, SetStateAction } from 'react'
import type { State } from '../useControllableState'
import { useCallback, useRef } from 'react'
import { useControllableState } from '../useControllableState'
import { toValue } from '../utils'

export interface UseStateWithControlOptions<T> {
  /**
   * Callback function before the state changing.
   *
   * Returning `false` to dismiss the change.
   */
  onBeforeChange?: (value: T, oldValue: T) => void | boolean

  /**
   * Callback function after the state changed.
   *
   * This happens synchronously, with less overhead compared to an effect.
   */
  onChanged?: (value: T, oldValue: T) => void
}

export interface UseStateWithControlControls<T> {
  /**
   * Get the current value. The `tracking` argument is accepted for API parity with upstream but is
   * a no-op in React — there is no reactivity dependency collection during render.
   */
  get: (tracking?: boolean) => T

  /**
   * Set the value with fine-grained control. `triggering` controls whether the change re-renders
   * the component (defaults to `true`).
   */
  set: (value: T, triggering?: boolean) => void

  /**
   * Get the value without tracking in the reactivity system — alias for `get(false)`.
   */
  untrackedGet: () => T

  /**
   * Set the value without triggering the reactivity system — alias for `set(value, false)`.
   */
  silentSet: (value: T) => void

  /**
   * Alias for `untrackedGet()`.
   */
  peek: () => T

  /**
   * Alias for `silentSet(value)`.
   */
  lay: (value: T) => void

  /**
   * Reset the value back to the initial value passed to the hook.
   */
  reset: () => void
}

export type UseStateWithControlReturn<T> = [
  /**
   * Current value — identical to the `value` a plain `useState` would hold.
   */
  value: T,
  /**
   * Setter to update the value (value or updater form, like `setState`).
   */
  setValue: Dispatch<SetStateAction<T>>,
  /**
   * Fine-grained controls over the value: `get` / `set` / `peek` / `lay`, the untracked/silent
   * shorthands, and `reset`.
   */
  control: UseStateWithControlControls<T>,
]

/**
 * A controlled source — a `[value, setter]` tuple or a `{ value, onChange }` object — whose value
 * is owned by the caller (re-rendered externally).
 */
function isControlledSource<T>(state: State<T>): boolean {
  return (
    (Array.isArray(state) && state.length === 2 && typeof state[1] === 'function')
    || (typeof state === 'object' && state !== null && !Array.isArray(state) && 'value' in state)
  )
}

/**
 * Fine-grained controls over a state and its re-renders — React port of VueUse's `refWithControl`.
 *
 * Map from @vueuse/shared `refWithControl`
 * (`source/vueuse/packages/shared/refWithControl/`). Upstream returns a single
 * writable Vue `Ref` extended with `get` / `set` / `untrackedGet` / `silentSet` / `peek` / `lay`.
 * This port owns the state like a `useState` and returns the React tuple `const [num, setNum,
 * control] = useStateWithControl(0)` — the name follows this repo's `ref*` → `useState*` mapping
 * rule. `setNum` behaves like a normal `setState` (value or updater form — the updater base is the
 * current internal value, which may be ahead of the rendered value after a silent write), while
 * `control` keeps the fine-grained get/set pair: `set(value, false)` (and `lay` / `silentSet`)
 * updates the value without re-rendering, and `peek` / `untrackedGet` read it back — in React there
 * is no dependency tracking during render, so those are plain aliases for the current value.
 * `reset()` (a small addition, upstream has no equivalent) restores the initial value and
 * participates in the change callbacks (`onBeforeChange` can dismiss it, `onChanged` fires when
 * accepted). Option names are kept from upstream: `onBeforeChange` can dismiss a change by
 * returning `false`, and `onChanged` fires synchronously after an accepted change.
 *
 * @param   state    State source: a plain value, getter, state tuple, or
 *                   `{ value, onChange }` controllable state.
 * @param   options
 * @return  A tuple `[value, setValue, control]` — the current value, a
 *          `setState`-like setter and the fine-grained control object.
 *
 * @example
 * const [num, setNum, control] = useStateWithControl(0)
 *
 * setNum(42) // just like a normal useState setter
 * control.set(30, false) // set the value without re-rendering
 * control.peek() // get the value without tracking
 */
export function useStateWithControl<T>(
  state: State<T>,
  options: UseStateWithControlOptions<T> = {},
): UseStateWithControlReturn<T> {
  const { onBeforeChange, onChanged } = options

  const initialRef = useRef(toValue(state))
  const sourceRef = useRef(initialRef.current)
  const [value, setState] = useControllableState(state, { passive: true })

  // `lastTriggeredRef` tracks the value the controlled source is currently
  // presenting. The render-time sync below then distinguishes a re-render
  // caused by our own triggering `set` (the rendered value matches the value
  // we triggered — `sourceRef` already holds it, keep it) from a genuine
  // external change (the parent re-rendered with a different value — adopt
  // it). A silent write (`set(value, false)`) does not touch the parent, so
  // `sourceRef` stays ahead of the rendered value and is NOT reverted by an
  // unrelated re-render.
  const lastTriggeredRef = useRef<T | undefined>(undefined)
  if (isControlledSource(state) && !Object.is(value, lastTriggeredRef.current)) {
    sourceRef.current = value
    lastTriggeredRef.current = value
  }

  // latest option callbacks, re-read on every render
  const callbacksRef = useRef({ onBeforeChange, onChanged })
  callbacksRef.current = { onBeforeChange, onChanged }

  const set = useCallback((nextValue: T, triggering = true) => {
    if (nextValue === sourceRef.current)
      return

    const old = sourceRef.current
    if (callbacksRef.current.onBeforeChange?.(nextValue, old) === false)
      return // dismissed

    sourceRef.current = nextValue
    callbacksRef.current.onChanged?.(nextValue, old)

    if (triggering) {
      // `setState` schedules the re-render — no forced-render counter needed
      lastTriggeredRef.current = nextValue
      setState(nextValue)
    }
  }, [])

  const get = useCallback((_tracking = true): T => {
    // no reactivity tracking in React — the argument is kept for API parity
    return sourceRef.current
  }, [])

  const untrackedGet = useCallback(() => get(false), [get])
  const silentSet = useCallback((nextValue: T) => set(nextValue, false), [set])
  const peek = useCallback(() => get(false), [get])
  const lay = useCallback((nextValue: T) => set(nextValue, false), [set])
  const reset = useCallback(() => set(initialRef.current), [set])

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((nextValue) => {
    const resolved = typeof nextValue === 'function'
      ? (nextValue as (current: T) => T)(sourceRef.current)
      : nextValue
    set(resolved)
  }, [set])

  const control: UseStateWithControlControls<T> = {
    get,
    set,
    untrackedGet,
    silentSet,
    peek,
    lay,
    reset,
  }

  return [value, setValue, control]
}
