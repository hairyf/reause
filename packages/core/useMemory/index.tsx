import type { Pausable } from '../useTimeoutPoll'
import { useIntervalFn } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Performance.memory
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 */
export interface MemoryInfo {
  /**
   * The maximum size of the heap, in bytes, that is available to the context.
   */
  readonly jsHeapSizeLimit: number
  /**
   * The total allocated heap size, in bytes.
   */
  readonly totalJSHeapSize: number
  /**
   * The currently active segment of JS heap, in bytes.
   */
  readonly usedJSHeapSize: number

  [Symbol.toStringTag]: 'MemoryInfo'
}

/**
 * Pausable controls a scheduler reports back — see `useTimeoutPoll` for the canonical core type.
 */
export interface UseMemoryOptions {
  /**
   * Custom scheduler driving the periodic memory reads.
   *
   * Called during render, so it must follow the Rules of Hooks — pass it consistently across
   * renders, e.g. `scheduler: cb => useIntervalFn(cb, 500)` with `useIntervalFn` from
   * `@reause/shared`.
   *
   * The returned `Pausable` is paused while `performance.memory` is unavailable and resumed once it
   * is detected, so `pause` / `resume` must actually control the loop.
   *
   * @default useIntervalFn (1000 ms)
   */
  scheduler?: (cb: () => void) => Pausable
}

export interface UseMemoryReturn {
  /**
   * Whether the `performance.memory` API is available in the current environment. `false` during
   * render and on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * The current heap memory info, `undefined` when unsupported (and before the first read).
   */
  memory: MemoryInfo | undefined
}

type PerformanceMemory = Performance & {
  memory: MemoryInfo
}

function getMemory(): MemoryInfo | undefined {
  if (typeof performance !== 'undefined' && 'memory' in performance)
    return (performance as PerformanceMemory).memory
  return undefined
}

/**
 * Reactive Memory Info.
 *
 * Map from @vueuse/core `useMemory`
 * (`source/vueuse/packages/core/useMemory/`), which reads the Chromium-only
 * non-standard `performance.memory` and keeps it fresh through a scheduler (upstream default:
 * `useIntervalFn`, 1000 ms). Reactive memory info as an object mirroring the upstream `{
 * isSupported, memory }` members.
 *
 * React divergences:
 * - the Vue `ShallowRef<MemoryInfo | undefined>` return becomes a plain
 *   `MemoryInfo | undefined` state, so read `memory` directly instead of
 *   `watch`ing it;
 * - `isSupported` (upstream `useSupported`) becomes a plain boolean that
 *   starts `false` and is computed in the mount effect, so nothing touches
 *   `performance` during render (SSR-safe);
 * - the first memory read happens in the mount effect;
 * - the `scheduler` option is called during render to compose the polling
 *   loop, so it must be passed consistently across renders (Rules of Hooks);
 *   the loop it returns is paused in an effect while the API is unsupported
 *   and resumed once support is detected, so an unsupported environment never
 *   keeps a timer polling (upstream instead skips composing the scheduler).
 *
 * @see https://vueuse.org/core/useMemory/
 * @param options
 *
 * @example
 * const { isSupported, memory } = useMemory()
 */
export function useMemory(options: UseMemoryOptions = {}): UseMemoryReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [memory, setMemory] = useState<MemoryInfo | undefined>(undefined)

  useEffect(() => {
    const info = getMemory()
    setIsSupported(info !== undefined)
    setMemory(info)
  }, [])

  const updateMemory = useCallback(() => {
    const info = getMemory()
    if (info)
      setMemory(info)
  }, [])

  const { scheduler = useIntervalFn } = options
  const pausable = scheduler(updateMemory)
  const pausableRef = useRef(pausable)
  pausableRef.current = pausable

  // Upstream only starts the polling loop when `performance.memory` exists
  // (`if (isSupported.value) scheduler(...)`). The scheduler has to be
  // composed on every render here — Rules of Hooks forbid the conditional
  // call — so the loop is started/stopped from an effect instead: an
  // unsupported environment leaves it paused, so no timer keeps polling.
  useEffect(() => {
    if (isSupported)
      pausableRef.current.resume()
    else
      pausableRef.current.pause()
  }, [isSupported])

  return { isSupported, memory }
}
