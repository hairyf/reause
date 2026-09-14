import { clamp, useControllableState } from '@reause/shared'
import { useCallback } from 'react'

/**
 * Map from @vueuse/math `useClamp`
 * (`source/vueuse/packages/math/useClamp/`).
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const [value, setValue] = useClamp(0, 0, 10)
 * setValue(15) // value is 10
 * setValue(-5) // value is 0
 *
 * @param value - The value to clamp.
 * @param min - The lower bound.
 * @param max - The upper bound.
 * @returns A `[value, setValue]` pair; `setValue` clamps into `[min, max]`.
 */
export function useClamp(
  value: number,
  min: number,
  max: number,
): [number, (value: number) => void] {
  const [raw, setRaw] = useControllableState(value, { passive: true })

  const current = clamp(raw, min, max)

  const setValue = useCallback((next: number) => {
    setRaw(clamp(next, min, max))
  }, [setRaw, min, max])

  return [current, setValue]
}
