import { useCallback, useEffect, useRef, useState } from 'react'

type Awaitable<T> = T | Promise<T>

export interface UseTimeoutPollOptions {
  /**
   * Start the timer immediately
   *
   * @default true
   */
  immediate?: boolean

  /**
   * Execute the callback immediately after calling `resume`
   *
   * @default false
   */
  immediateCallback?: boolean
}

export interface Pausable {
  /**
   * `true` while the poll is active
   */
  isActive: boolean
  /**
   * Stop the poll — the pending timeout is cleared and no further runs are scheduled; a callback
   * already in flight still finishes
   */
  pause: () => void
  /**
   * (Re)start the poll — schedules the next run one `interval` later
   */
  resume: () => void
}

/**
 * Map from @vueuse/core `useTimeoutPoll`
 * (`source/vueuse/packages/core/useTimeoutPoll/`).
 *
 * @example
 * const { isActive, pause, resume } = useTimeoutPoll(fetchData, 1000)
 */
export function useTimeoutPoll(
  fn: () => Awaitable<void>,
  interval: number,
  options: UseTimeoutPollOptions = {},
): Pausable {
  const { immediate = true, immediateCallback = false } = options

  // keep the latest callback / option values in refs so `pause` and `resume`
  // stay referentially stable and the poll chain never restarts when the
  // (typically stable) callback identity changes
  const fnRef = useRef(fn)
  fnRef.current = fn
  const intervalRef = useRef(interval)
  intervalRef.current = interval
  const immediateCallbackRef = useRef(immediateCallback)
  immediateCallbackRef.current = immediateCallback

  const [isActive, setIsActive] = useState(false)
  const isActiveRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function schedule() {
    clearTimer()
    timerRef.current = setTimeout(loop, intervalRef.current)
  }

  async function loop() {
    timerRef.current = null
    if (!isActiveRef.current)
      return

    await fnRef.current()

    // the next run is scheduled only once the previous one is done — pausing
    // while a callback is in flight ends the chain here
    if (isActiveRef.current)
      schedule()
  }

  const pause = useCallback(() => {
    isActiveRef.current = false
    setIsActive(false)
    clearTimer()
  }, [])

  const resume = useCallback(() => {
    if (isActiveRef.current)
      return

    isActiveRef.current = true
    setIsActive(true)
    if (immediateCallbackRef.current)
      fnRef.current()
    schedule()
  }, [])

  // upstream has no interval watcher: `useTimeoutFn` reads `toValue(interval)`
  // only when the next run is dispatched, so a changed `interval` does not
  // re-arm the pending timeout — it keeps its old cadence until the next
  // `schedule()` reads the new value
  useEffect(() => {
    if (immediate)
      resume()
    return () => {
      pause()
    }
  }, [immediate, pause, resume])

  return { isActive, pause, resume }
}
