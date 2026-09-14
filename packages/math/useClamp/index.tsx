import { clamp, useControllableState } from '@reause/shared'
import { useCallback } from 'react'

/**
 * Reactively clamp a value between two other values.
 *
 * Map from @vueuse/math `useClamp`
 * (`source/vueuse/packages/math/useClamp/`). React port of VueUse's writable
 * `useClamp` — returns a `[value, setValue]` tuple whose setter clamps on write. `value`, `min` and
 * `max` are plain read-only numbers resolved on every render: `value` seeds the hook's internal
 * state (and re-syncs when it changes), and bounds are re-resolved on every render and on every
 * set, so shrinking `max` / raising `min` re-clamps the current value automatically.
 *
 * React divergence: all three parameters are plain `number`, not upstream's
 * `MaybeRefOrGetter<number>`. The caller re-renders with new values (e.g. from `useState`) instead
 * of passing a ref/getter. Upstream's writable computed also writes the clamped value back into its
 * internal ref on every read, so an out-of-bounds seed stays clamped even after the bounds loosen;
 * here `value` is a plain prop that re-seeds internal state when it changes and the raw seed is
 * re-clamped on every render, so loosening the bounds re-exposes the raw seed until the next
 * `setValue`.
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
