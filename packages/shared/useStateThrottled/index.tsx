import type { Dispatch, SetStateAction } from 'react'
import type { State } from '../useControllableState'
import { useEffect, useRef, useState } from 'react'
import { useControllableState } from '../useControllableState'
import { useThrottleFn } from '../useThrottleFn'

export type UseStateThrottledReturn<T = any> = [value: T, setValue: Dispatch<SetStateAction<T>>, throttled: T]

/**
 * Throttle changing of a state value — React port of VueUse's `refThrottled`.
 *
 * The `value` argument accepts any `State<T>` supported by `useControllableState`: a plain value,
 * lazy initializer, controlled tuple, or `{ value, onChange }` source. The returned tuple contains
 * the current value, its setter, and a throttled mirror.
 *
 * A `delay <= 0` short-circuits like upstream (`if (delay <= 0) return value`): the throttled
 * element is the input itself — no throttling, no timers.
 *
 * @param value State source accepted by `useControllableState`.
 * @param delay Delay in milliseconds between commits (default: 200).
 * @param trailing Whether to commit the latest value after the window (default: true).
 * @param leading Whether to commit on the leading edge (default: true).
 */
export function useStateThrottled<T = any>(
  value: State<T>,
  delay = 200,
  trailing = true,
  leading = true,
): UseStateThrottledReturn<T> {
  const [input, setInput] = useControllableState(value, { passive: true })
  const [throttled, setThrottled] = useState(input)
  const inputRef = useRef(input)
  inputRef.current = input
  const delayRef = useRef(delay)
  delayRef.current = delay

  const throttledFn = useThrottleFn(() => {
    setThrottled(inputRef.current)
  }, delay, trailing, leading)

  const isFirstRunRef = useRef(true)
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
      return
    }
    // upstream short-circuits `delay <= 0` — no throttling at all, so the
    // mirror never needs to be committed (the returned throttled element is
    // the input itself, identity)
    if (delayRef.current > 0)
      void throttledFn()
  }, [input, throttledFn])

  if (delay <= 0)
    return [input, setInput, input]

  return [input, setInput, throttled]
}
