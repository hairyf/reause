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
 * Map from @vueuse/core `useFps`
 * (`source/vueuse/packages/core/useFps/`).
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
