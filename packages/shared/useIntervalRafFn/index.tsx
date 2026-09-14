import { useLatest } from '@reause/shared'
import { useCallback, useEffect, useRef } from 'react'

/**
 * A scheduled frame-aligned interval. `id` is a frame handle when the `requestAnimationFrame`
 * branch is active and a `setInterval` handle when the environment downgrades — the tagged
 * single-field shape ahooks uses, so the clear path can re-derive which canceller belongs to the
 * handle the way upstream does.
 */
interface Handle {
  id: ReturnType<typeof setInterval> | ReturnType<typeof requestAnimationFrame>
}

/**
 * ahooks' own `isNumber` (`packages/hooks/src/utils/index.ts`): a number that is not `NaN`. Kept
 * local because `@reause/shared` has no equivalent export — `NaN` fails it on purpose, so a `NaN`
 * delay disables the loop instead of arming one that could never fire.
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * Arm a **repeating** frame-aligned interval. `start` is captured once and then reset to
 * `Date.now()` *after* every callback, so each fire re-arms the next frame and moves the deadline
 * forward: the loop keeps running until it is cleared. The period is therefore `delay` rounded up
 * to the next frame boundary (upstream's documented timing quirk), not an exact `delay`. When
 * `requestAnimationFrame` is undefined the call downgrades to a plain `setInterval`, which is what
 * makes the hook usable during a server render.
 */
function setRafInterval(callback: () => void, delay: number = 0): Handle {
  if (typeof requestAnimationFrame === 'undefined') {
    return {
      id: setInterval(callback, delay),
    }
  }

  let start = Date.now()

  const handle: Handle = {
    id: 0,
  }

  function loop() {
    const current = Date.now()
    // Re-arm *before* the deadline test, exactly like upstream: the handle must
    // already name the next frame when the callback runs, so a `clear()` called
    // from inside the callback cancels that next frame and really stops the
    // loop.
    handle.id = requestAnimationFrame(loop)
    if (current - start >= delay) {
      callback()
      start = Date.now()
    }
  }

  handle.id = requestAnimationFrame(loop)
  return handle
}

/**
 * Upstream classifies the handle by asking whether `cancelAnimationFrame` exists — not by
 * remembering which branch armed it. Preserved as-is (a mirroring quirk, see the hook's note
 * below).
 */
function cancelAnimationFrameIsNotDefined(_id: Handle['id']): _id is ReturnType<typeof setInterval> {
  return typeof cancelAnimationFrame === 'undefined'
}

function clearRafInterval(handle: Handle) {
  if (cancelAnimationFrameIsNotDefined(handle.id)) {
    clearInterval(handle.id)
    return
  }
  cancelAnimationFrame(handle.id)
}

/**
 * Options for `useIntervalRafFn`, mirroring ahooks' inline options object.
 */
export interface UseIntervalRafFnOptions {
  /**
   * Run `fn` synchronously once when the loop is armed, before the first frame
   *
   * @default false
   */
  immediate?: boolean
}

/**
 * Map from ahooks `useRafInterval`
 * (`source/ahooks/packages/hooks/src/useRafInterval/`).
 *
 * @example
 * const clear = useIntervalRafFn(() => setCount(c => c + 1), 1000)
 * // later:
 * clear()
 *
 * @param fn Callback to run on every frame at or after `delay` has elapsed.
 * @param delay Milliseconds between fires, rounded up to the next frame.
 * `undefined`, `NaN` or a negative number disables the loop.
 * @param options `{ immediate }` runs `fn` once before the first frame.
 * @returns `clear`, a referentially stable function that cancels the running
 * loop. It returns nothing.
 */
export function useIntervalRafFn(
  fn: () => void,
  delay: number | undefined,
  options?: UseIntervalRafFnOptions,
): () => void {
  const immediate = options?.immediate

  const fnRef = useLatest(fn)
  const timerRef = useRef<Handle>(undefined)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearRafInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isNumber(delay) || delay < 0) {
      return
    }
    if (immediate) {
      fnRef.current()
    }
    timerRef.current = setRafInterval(() => {
      fnRef.current()
    }, delay)
    return clear
  }, [delay])

  return clear
}
