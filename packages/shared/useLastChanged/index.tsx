import { useEffect, useRef, useState } from 'react'
import { timestamp } from '../utils'

export interface UseLastChangedOptions<InitialValue extends number | null | undefined = undefined> {
  /**
   * Value returned before any change has been recorded.
   *
   * (Upstream also extends Vue's `WatchOptions` — `immediate` / `deep` / `flush` / `once` have no
   * React equivalent here, see the mapping note.)
   *
   * @default null
   */
  initialValue?: InitialValue
}

export type UseLastChangedReturn = number | null

/**
 * Map from @vueuse/shared `useLastChanged`.
 *
 * @see https://vueuse.org/shared/useLastChanged
 */
export function useLastChanged<T>(value: T, options?: UseLastChangedOptions<undefined>): UseLastChangedReturn
export function useLastChanged<T>(value: T, options: UseLastChangedOptions<number>): number
export function useLastChanged<T>(value: T, options: UseLastChangedOptions<number | null | undefined> = {}): number | null {
  const [lastChanged, setLastChanged] = useState<number | null>(() => options.initialValue ?? null)
  const prevValue = useRef(value)

  // Mapping: upstream watches a `WatchSource` and stores the timestamp in a
  // readonly shallow ref; React has no reactive watch, so the hook takes the
  // current value directly (re-evaluated on every render), compares it with
  // the previous render via `Object.is` inside a post-commit `useEffect` and
  // exposes the timestamp as a plain `number | null` (no `.value`). Because
  // the record happens in an effect, the updated timestamp becomes visible
  // on the render following the change (upstream records on the watch
  // flush). Upstream's watch options have no React equivalent: `flush:
  // 'sync'` is not reproducible (effects always run after commit) and
  // `immediate: true` is redundant with `initialValue` (e.g.
  // `initialValue: Date.now()`), so only `initialValue` is supported.
  useEffect(() => {
    if (!Object.is(prevValue.current, value)) {
      prevValue.current = value
      setLastChanged(timestamp())
    }
  })

  return lastChanged
}
