import type { State } from '../useControllableState'
import { useCallback, useRef } from 'react'
import { useControllableState } from '../useControllableState'
import { clamp, toValue } from '../utils'

export interface UseCounterOptions {
  min?: number
  max?: number
}

export interface UseCounterReturn {
  /**
   * The current value of the counter.
   */
  count: number
  /**
   * Increment the counter.
   *
   * @param {number} [delta=1] The number to increment.
   */
  inc: (delta?: number) => void
  /**
   * Decrement the counter.
   *
   * @param {number} [delta=1] The number to decrement.
   */
  dec: (delta?: number) => void
  /**
   * Get the current value of the counter — the latest rendered value (React state updates are
   * applied on the next render, so a read right after `inc` / `dec` / `set` still sees the previous
   * value).
   */
  get: () => number
  /**
   * Set the counter to a new value (clamped to `[min, max]`).
   *
   * @param value The new value of the counter.
   */
  set: (value: number) => void
  /**
   * Reset the counter to the initial value — or to `val` when passed, which also rebases the value
   * future resets restore — and return the new value.
   *
   * @param val The value to reset to (defaults to the initial value).
   */
  reset: (val?: number) => number
}

/**
 * Map from @vueuse/shared `useCounter`.
 *
 * @example
 * const { count, inc, dec, set, reset } = useCounter(10, { min: 0, max: 100 })
 */
export function useCounter(
  initialValue: State<number> = 0,
  options: UseCounterOptions = {},
): UseCounterReturn {
  const { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = options
  const minRef = useRef(min)
  const maxRef = useRef(max)
  // the rebasable initial value — `reset(val)` stores `val` for future resets
  // (upstream: `let _initialValue = unref(initialValue)`, read once)
  const initialRef = useRef(toValue(initialValue))
  const [count, setCount] = useControllableState(initialValue, { passive: true })

  const set = useCallback((value: number) => {
    setCount((current) => {
      const next = clamp(value, minRef.current, maxRef.current)
      return current === next ? current : next
    })
  }, [])

  const get = useCallback(() => count, [count])

  const inc = useCallback((delta = 1) => {
    setCount((current) => {
      const next = clamp(current + delta, minRef.current, maxRef.current)
      return current === next ? current : next
    })
  }, [])

  const dec = useCallback((delta = 1) => {
    setCount((current) => {
      const next = clamp(current - delta, minRef.current, maxRef.current)
      return current === next ? current : next
    })
  }, [])

  const reset = useCallback((val?: number) => {
    const target = val === undefined ? initialRef.current : val
    initialRef.current = target
    const next = clamp(target, minRef.current, maxRef.current)
    setCount(current => (current === next ? current : next))
    return next
  }, [])

  return { count, inc, dec, get, set, reset }
}
