import type { ConfigurableWindow } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

// `Pausable`'s neutral home (upstream defines it in `@vueuse/shared`).
// Re-exported here so hooks whose default scheduler is `useRafFn` (e.g.
// `useElementByPoint`) import it from the scheduler they actually use.
export type { Pausable } from '../useTimeoutPoll'

export interface UseRafFnCallbackArguments {
  /**
   * Time elapsed between this and the last frame.
   */
  delta: number

  /**
   * Time elapsed since the creation of the web page. See {@link
   * https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp#the_time_origin Time
   * origin}.
   */
  timestamp: DOMHighResTimeStamp
}

export interface UseRafFnOptions extends ConfigurableWindow {
  /**
   * Start the requestAnimationFrame loop immediately on creation
   *
   * @default true
   */
  immediate?: boolean
  /**
   * The maximum frame per second to execute the function. Set to `null` to disable the limit.
   *
   * @default null
   */
  fpsLimit?: number | null
  /**
   * After the requestAnimationFrame loop executed once, it will be automatically stopped.
   *
   * @default false
   */
  once?: boolean
}

export interface UseRafFnReturn {
  /**
   * `true` while the animation frame loop is active
   */
  isActive: boolean
  /**
   * Stop the loop — the pending frame is cancelled and no further frames are scheduled
   */
  pause: () => void
  /**
   * (Re)start the loop — schedules the next frame immediately
   */
  resume: () => void
}

/**
 * Map from @vueuse/core `useRafFn`
 * (`source/vueuse/packages/core/useRafFn/`).
 *
 * @example
 * const { pause, resume } = useRafFn(() => setCount(c => c + 1))
 */
export function useRafFn(
  fn: (args: UseRafFnCallbackArguments) => void,
  options: UseRafFnOptions = {},
): UseRafFnReturn {
  const {
    immediate = true,
    fpsLimit = null,
    window: windowOption = typeof window === 'undefined' ? undefined : window,
    once = false,
  } = options

  const [isActive, setIsActive] = useState(false)
  const isActiveRef = useRef(false)

  // keep the latest callback / option values in refs so `pause` and `resume`
  // stay referentially stable and the running frame loop reads fresh values
  const fnRef = useRef(fn)
  fnRef.current = fn
  const fpsLimitRef = useRef(fpsLimit)
  fpsLimitRef.current = fpsLimit
  const onceRef = useRef(once)
  onceRef.current = once
  const windowRef = useRef(windowOption)
  windowRef.current = windowOption

  const rafIdRef = useRef<number | null>(null)
  const previousFrameTimestampRef = useRef(0)

  const loop = useCallback(function loop(timestamp: DOMHighResTimeStamp) {
    const win = windowRef.current
    if (!isActiveRef.current || !win)
      return

    if (!previousFrameTimestampRef.current)
      previousFrameTimestampRef.current = timestamp

    const delta = timestamp - previousFrameTimestampRef.current

    const limit = fpsLimitRef.current
    const intervalLimit = limit ? 1000 / limit : null

    if (intervalLimit && delta < intervalLimit) {
      rafIdRef.current = win.requestAnimationFrame(loop)
      return
    }

    previousFrameTimestampRef.current = timestamp
    fnRef.current({ delta, timestamp })
    if (onceRef.current) {
      isActiveRef.current = false
      setIsActive(false)
      rafIdRef.current = null
      return
    }
    rafIdRef.current = win.requestAnimationFrame(loop)
  }, [])

  const resume = useCallback(() => {
    const win = windowRef.current
    if (!isActiveRef.current && win) {
      isActiveRef.current = true
      setIsActive(true)
      previousFrameTimestampRef.current = 0
      rafIdRef.current = win.requestAnimationFrame(loop)
    }
  }, [loop])

  const pause = useCallback(() => {
    isActiveRef.current = false
    setIsActive(false)
    if (rafIdRef.current != null && windowRef.current)
      windowRef.current.cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = null
  }, [])

  // upstream resumes synchronously during setup when `immediate` and reads
  // that flag exactly once — a later option change never restarts or stops
  // the loop — so snapshot the initial value and key the effect on the two
  // stable controls only. Its cleanup pauses the loop on unmount (upstream:
  // tryOnScopeDispose(pause))
  const immediateRef = useRef(immediate)
  useEffect(() => {
    if (immediateRef.current)
      resume()
    return () => {
      pause()
    }
  }, [pause, resume])

  return { isActive, pause, resume }
}
