import { useCallback, useEffect, useRef, useState } from 'react'

export type UsePerformanceObserverOptions = PerformanceObserverInit & {
  /**
   * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
   */
  window?: Window
  /**
   * Start the observer immediate.
   *
   * @default true
   */
  immediate?: boolean
}

// Default substitution applies only to `undefined` — an explicit `window:
// null` resolves to `undefined` and leaves the hook inert (isSupported
// false, start() a no-op), matching upstream's `window = defaultWindow`
// destructure.
function resolveWindow(windowOption: Window | undefined): Window | undefined {
  return windowOption === undefined
    ? (typeof window === 'undefined' ? undefined : window)
    : windowOption
}

/**
 * Map from @vueuse/core `usePerformanceObserver`
 * (`source/vueuse/packages/core/usePerformanceObserver/`), which creates a
 * `PerformanceObserver` and returns `{ isSupported, start, stop }`.
 *
 * React divergences:
 * - the `isSupported` computed ref becomes plain boolean state evaluated in
 *   the mount effect, so nothing touches `window` during render (SSR-safe —
 *   the server renders `false` without accessing `PerformanceObserver`);
 * - the observer is created inside a mount `useEffect` (upstream starts synchronously during setup
 * when `immediate` is `true`); changing the `window` option re-subscribes;
 * - the callback and observe options are read through refs, so the returned
 *   `start`/`stop` are stable across renders (`stop` reads the observer from
 *   a sync ref);
 * - when the resolved `window` has no `PerformanceObserver`, the hook reports `isSupported: false`
 * and `start()` is a silent no-op (same as upstream).
 *
 * @example
 * const [entrys, setEntrys] = useState<PerformanceEntry[]>([])
 * const { isSupported, start, stop } = usePerformanceObserver(
 *   { entryTypes: ['paint'] },
 *   list => setEntrys(list.getEntries()),
 * )
 */
export function usePerformanceObserver(
  options: UsePerformanceObserverOptions,
  callback: PerformanceObserverCallback,
) {
  const { window: customWindow, immediate = true } = options

  const [isSupported, setIsSupported] = useState(false)
  const observerRef = useRef<PerformanceObserver | undefined>(undefined)

  // keep the latest callback and observe options reachable from the stable
  // `start` without re-creating the observer on every render
  const callbackRef = useRef(callback)
  const optionsRef = useRef(options)
  useEffect(() => {
    callbackRef.current = callback
    optionsRef.current = options
  })

  const stop = useCallback(() => {
    observerRef.current?.disconnect()
  }, [])

  const start = useCallback(() => {
    const { window: windowOption, ...performanceOptions } = optionsRef.current
    const win = resolveWindow(windowOption)

    if (win && 'PerformanceObserver' in win) {
      observerRef.current?.disconnect()
      observerRef.current = new PerformanceObserver((list, observer) => callbackRef.current(list, observer))
      observerRef.current.observe(performanceOptions)
    }
  }, [])

  useEffect(() => {
    const win = resolveWindow(customWindow)
    setIsSupported(Boolean(win && 'PerformanceObserver' in win))

    if (immediate)
      start()

    return stop
  }, [customWindow, immediate, start, stop])

  return { isSupported, start, stop }
}
