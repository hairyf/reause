import type { State } from '../useControllableState'
import { useCallback, useRef } from 'react'
import { useControllableState } from '../useControllableState'

export interface UseToggleOptions<Truthy, Falsy> {
  /**
   * Custom value for `true`
   *
   * @default true
   */
  truthyValue?: Truthy

  /**
   * Custom value for `false`
   *
   * @default false
   */
  falsyValue?: Falsy
}

export type UseToggleReturn<T extends boolean | number | string = boolean> = [
  T,
  (value?: T | ((current: T) => T)) => void,
]

/**
 * React port of VueUse's `useToggle` — a toggler between a truthy and a falsy value, both
 * configurable.
 *
 * Map from @vueuse/shared `useToggle`
 * Mapping: `ref(initialValue)` → `useControllableState(initialValue)`, `toggle()` → stable
 * `useCallback`; accepts the full `State<T>` input. `truthyValue` / `falsyValue` are plain values.
 * returns the new value synchronously; React state updates are async, so here `toggle` is `() =>
 * void` and the new value is read from `value` on the next render. Like upstream, a bare `toggle()`
 * flips between `truthyValue` and `falsyValue`, `toggle(value)` (including an explicit `undefined`)
 * forces the value, and a function argument is applied as a functional update (React adaptation).
 *
 * @example
 * const [value, toggle] = useToggle()
 * toggle()        // false → true
 * toggle(false)   // force to false
 *
 * const [status, toggleStatus] = useToggle('on', { truthyValue: 'on', falsyValue: 'off' })
 * toggleStatus()  // 'on' → 'off'
 */
export function useToggle<T extends boolean | number | string = boolean, Truthy = true, Falsy = false>(
  initialValue: State<T> = false as T,
  options: UseToggleOptions<Truthy, Falsy> = {},
): UseToggleReturn<T> {
  const { truthyValue = true as Truthy, falsyValue = false as Falsy } = options
  const [state, setState] = useControllableState(initialValue, { passive: true })

  // keep the latest truthy/falsy values in refs so `toggle` stays referentially stable
  const truthyRef = useRef<T>(truthyValue as unknown as T)
  truthyRef.current = truthyValue as unknown as T
  const falsyRef = useRef<T>(falsyValue as unknown as T)
  falsyRef.current = falsyValue as unknown as T

  const toggle = useCallback((...args: [value?: T | ((current: T) => T)]) => {
    const hasValue = args.length > 0
    const value = args[0]
    setState((current) => {
      if (hasValue) {
        if (typeof value === 'function')
          return (value as (c: T) => T)(current)
        // an explicit argument forces the value (upstream: `arguments.length`)
        return value as T
      }
      // no argument: flip between the truthy and falsy values
      return Object.is(current, truthyRef.current) ? falsyRef.current : truthyRef.current
    })
  }, [setState])

  return [state, toggle]
}
