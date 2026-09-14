import { useRef, useState } from 'react'
import { useRafFn } from '../useRafFn'

export interface UseFpsOptions {
  /**
   * Calculate the FPS on every x frames.
   *
   * @default 10
   */
  every?: number
}

/**
 * Reactive FPS (frames per second).
 *
 * Map from @vueuse/core `useFps`
 * (`source/vueuse/packages/core/useFps/`): counts `requestAnimationFrame`
 * ticks and reports the rounded frame rate once `every` frames (default 10) have elapsed, driven by
 * the shared `useRafFn` frame loop.
 *
 * React divergences:
 * - the upstream `ShallowRef<number>` becomes a plain number state
 *   (`useState(0)`), and the upstream `typeof performance === 'undefined'`
 *   early return becomes a per-frame guard, so SSR renders only ever see the
 *   `0` default and never touch `performance` or `requestAnimationFrame`;
 * - the setup-time `useRafFn` subscription becomes `useRafFn`'s mount effect,
 *   cancelled on unmount;
 * - `last` / `ticks` bookkeeping live in refs instead of the setup closure,
 *   so the running frame loop always reads the latest values; `last` is
 *   seeded at setup time (upstream parity), so the first rate is reported
 *   after `every` frames.
 *
 * @example
 * const fps = useFps()
 */
export function useFps(options?: UseFpsOptions): number {
  const [fps, setFps] = useState(0)
  const every = options?.every ?? 10

  // Seeded at setup like upstream's `let last = performance.now()`; the
  // `typeof` guard keeps SSR renders from touching `performance`.
  const lastRef = useRef<number | null>(typeof performance === 'undefined' ? null : performance.now())
  const ticksRef = useRef(0)

  useRafFn(() => {
    if (typeof performance === 'undefined' || lastRef.current == null)
      return

    const now = performance.now()
    ticksRef.current += 1
    if (ticksRef.current >= every) {
      const diff = now - lastRef.current
      setFps(Math.round(1000 / (diff / ticksRef.current)))
      lastRef.current = now
      ticksRef.current = 0
    }
  })

  return fps
}
