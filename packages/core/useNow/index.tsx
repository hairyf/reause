import type { Pausable } from '../useTimeoutPoll'
import { useCallback, useState } from 'react'
import { useRafFn } from '../useRafFn'

export interface UseNowOptions<Controls extends boolean> {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls

  /**
   * Custom scheduler to use for interval execution.
   *
   * Called during render, so it must follow the Rules of Hooks — pass it consistently across
   * renders, e.g. `scheduler: cb => useIntervalFn(cb, 500)` with `useIntervalFn` from
   * `@reause/shared`.
   *
   * @default useRafFn
   */
  scheduler?: (cb: () => void) => Pausable
}

export type UseNowReturn<Controls extends boolean> = Controls extends true
  ? ({ now: Date } & Pausable)
  : Date

/**
 * Map from @vueuse/core `useNow`
 * (`source/vueuse/packages/core/useNow/`). Reactive current `Date` instance,
 * updated by the `scheduler` — upstream's default scheduler is `useRafFn`.
 *
 * React divergences:
 * - the upstream `ShallowRef<Date>` return becomes a plain `Date` state;
 * - with `controls: true` the return is `{ now, isActive, pause, resume }`,
 *   where `isActive` is a plain boolean state (upstream's `Pausable` exposes
 *   it as a ref) and `pause`/`resume` toggle the underlying loop;
 * - the `scheduler` option is called during render to compose the update loop
 *   (Rules of Hooks) and defaults to `useRafFn`, mirroring upstream.
 *
 * @see https://vueuse.org/useNow/
 * @param options - UseNowOptions
 *
 * @example
 * const now = useNow()
 */
export function useNow(options?: UseNowOptions<false>): Date
export function useNow(options: UseNowOptions<true>): { now: Date } & Pausable
export function useNow(options: UseNowOptions<boolean> = {}): UseNowReturn<boolean> {
  const {
    controls: exposeControls = false,
    scheduler = useRafFn,
  } = options

  const [now, setNow] = useState(() => new Date())

  const update = useCallback(() => setNow(new Date()), [])

  const { isActive, pause, resume } = scheduler(update)

  if (exposeControls) {
    return {
      now,
      isActive,
      pause,
      resume,
    }
  }
  else {
    return now
  }
}
