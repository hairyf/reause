import { useCallback, useEffect, useRef, useState } from 'react'

type Fn = () => void

export interface UseIntervalFnOptions {
  /**
   * Start the timer automatically when the component mounts
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

export interface UseIntervalFnReturn {
  /**
   * Whether the timer is currently active
   */
  isActive: boolean

  /**
   * Pause the timer
   */
  pause: () => void

  /**
   * Resume the timer (restarts it with the current interval)
   */
  resume: () => void
}

/**
 * Map from @vueuse/shared `useIntervalFn`.
 *
 * @example
 * const { isActive, pause, resume } = useIntervalFn(() => { ... }, 1000)
 */
export function useIntervalFn(
  cb: Fn,
  interval: number = 1000,
  options: UseIntervalFnOptions = {},
): UseIntervalFnReturn {
  const { immediate = true, immediateCallback = false } = options

  const [isActive, setIsActive] = useState(false)
  const isActiveRef = useRef(false)

  const cbRef = useRef(cb)
  const intervalRef = useRef(interval)
  const immediateCallbackRef = useRef(immediateCallback)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // update the refs each render so every tick and restart uses the newest
  // callback, interval and options
  cbRef.current = cb
  intervalRef.current = interval
  immediateCallbackRef.current = immediateCallback

  // `immediate` is read once at mount — upstream reads it once at setup, so a
  // later `immediate: false` render must not stop a running timer
  const immediateRef = useRef(immediate)

  function clean() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function setActive(active: boolean) {
    isActiveRef.current = active
    setIsActive(active)
  }

  const pause = useCallback(() => {
    setActive(false)
    clean()
  }, [])

  const resume = useCallback(() => {
    const intervalValue = intervalRef.current
    if (intervalValue <= 0)
      return
    setActive(true)
    if (immediateCallbackRef.current)
      cbRef.current()
    clean()
    // the callback may have paused the timer synchronously
    if (isActiveRef.current)
      timerRef.current = setInterval(() => cbRef.current(), intervalValue)
  }, [])

  // start on mount when `immediate`; clear a pending timer on unmount
  useEffect(() => {
    if (immediateRef.current)
      resume()

    return () => {
      clean()
    }
  }, [resume])

  // restart the timer when the interval changes while active
  // (upstream: a `watch` on the interval calls `resume()`)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    if (isActiveRef.current)
      resume()
  }, [interval, resume])

  return { isActive, pause, resume }
}
