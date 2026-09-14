import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseTimeoutOptions<Controls extends boolean = false> {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls
  /**
   * Callback on timeout
   */
  callback?: () => void
  /**
   * Start the timer immediately
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Execute the callback immediately after calling `start`
   *
   * @default false
   */
  immediateCallback?: boolean
}

export interface UseTimeoutReturn {
  /**
   * `true` once the timeout has fired
   */
  ready: boolean
  /**
   * `true` while the timer is armed and waiting
   */
  isPending: boolean
  /**
   * (Re)arm the timer
   */
  start: () => void
  /**
   * Cancel the pending timer
   */
  stop: () => void
}

/**
 * Map from @vueuse/shared `useTimeout`
 * Mapping: upstream `useTimeout` wraps `useTimeoutFn` and derives `ready` as `!isPending`; since
 * `useTimeoutFn` is mapped in its own module, this port inlines the timer logic to stay
 * self-contained — `ref` → `useState` for `isPending`, `ready` derived as `!isPending` like
 * upstream, the setup-time `start()` (immediate) becomes an empty-dependency `useEffect` on mount,
 * and `tryOnScopeDispose(stop)` becomes the effect cleanup. `interval` is a plain number; `start` /
 * `stop` are stable `useCallback`s.
 *
 * @example
 * const ready = useTimeout(1000) // boolean, becomes true after 1s
 *
 * const { ready, start, stop } = useTimeout(1000, { controls: true })
 */
export function useTimeout(interval?: number, options?: UseTimeoutOptions<false>): boolean
export function useTimeout(interval: number, options: UseTimeoutOptions<true>): UseTimeoutReturn
export function useTimeout(
  interval: number = 1000,
  options: UseTimeoutOptions<boolean> = {},
): boolean | UseTimeoutReturn {
  const {
    controls: exposeControls = false,
    callback,
    immediate = true,
    immediateCallback = false,
  } = options

  const [isPending, setIsPending] = useState(immediate)

  // keep the latest interval / callbacks in refs so `start` and `stop`
  // stay referentially stable
  const intervalRef = useRef(interval)
  intervalRef.current = interval
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const immediateCallbackRef = useRef(immediateCallback)
  immediateCallbackRef.current = immediateCallback

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsPending(false)
  }, [])

  const start = useCallback(() => {
    if (immediateCallbackRef.current)
      callbackRef.current?.()
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsPending(true)
    const delay = intervalRef.current
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setIsPending(false)
      callbackRef.current?.()
    }, delay)
  }, [])

  // upstream arms the timer synchronously during setup; in React the
  // equivalent is a mount effect — its cleanup also stops the timer on
  // unmount (upstream: tryOnScopeDispose(stop))
  useEffect(() => {
    if (immediate)
      start()
    return stop
  }, [])

  // upstream derives `ready` as `!isPending` (computed); React has no computed
  // refs, so it is derived during render
  const ready = !isPending

  if (exposeControls)
    return { ready, isPending, start, stop }

  return ready
}
