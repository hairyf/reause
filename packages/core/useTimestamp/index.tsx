import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseTimestampOptions<Controls extends boolean> {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls

  /**
   * Offset value adding to the value
   *
   * @default 0
   */
  offset?: number

  /**
   * Callback on each update
   */
  callback?: (timestamp: number) => void
}

export interface UseTimestampControls {
  timestamp: number
  isActive: boolean
  pause: () => void
  resume: () => void
}

export type UseTimestampReturn<Controls extends boolean> = Controls extends true
  ? UseTimestampControls
  : number

/**
 * Map from @vueuse/core `useTimestamp`
 * (`source/vueuse/packages/core/useTimestamp/`).
 *
 * @example
 * const timestamp = useTimestamp({ offset: 0 })
 */
export function useTimestamp(options?: UseTimestampOptions<false>): number
export function useTimestamp(options: UseTimestampOptions<true>): UseTimestampControls
export function useTimestamp(options: UseTimestampOptions<boolean> = {}): UseTimestampReturn<boolean> {
  const {
    controls = false,
    offset = 0,
    callback,
  } = options

  // upstream reads `offset` once at setup — freeze it on the first render so
  // a later change to the option does not restart the loop
  const offsetRef = useRef(offset)

  const [timestamp, setTimestamp] = useState(() => Date.now() + offsetRef.current)
  const [isActive, setIsActive] = useState(true)

  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    if (!isActive)
      return

    let rafId: number

    function tick() {
      const value = Date.now() + offsetRef.current
      setTimestamp(value)
      callbackRef.current?.(value)
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [isActive])

  const pause = useCallback(() => setIsActive(false), [])
  const resume = useCallback(() => setIsActive(true), [])

  if (controls)
    return { timestamp, isActive, pause, resume }

  return timestamp
}
