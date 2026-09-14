import { useLatest } from '@reause/shared'
import { useCallback, useEffect, useRef } from 'react'

/**
 * A scheduled frame-aligned timeout. `id` is a frame handle when the `requestAnimationFrame` branch
 * is active and a `setTimeout` handle when the environment downgrades — the tagged single-field
 * shape ahooks uses, so the clear path can re-derive which canceller belongs to the handle the way
 * upstream does.
 */
interface Handle {
  id: ReturnType<typeof setTimeout> | ReturnType<typeof requestAnimationFrame>
}

/**
 * ahooks' own `isNumber` (`packages/hooks/src/utils/index.ts`): a number that is not `NaN`. Kept
 * local because `@reause/shared` has no equivalent export — `NaN` fails it on purpose, so a `NaN`
 * delay disables the timeout instead of arming one that could never fire.
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * Arm a **one-shot** frame-aligned timeout: `startTime` is captured once, and each frame only
 * checks `Date.now() - startTime >= delay`. The first frame at or after `delay` runs the callback
 * and schedules **no** further frame, so the timeout stops by construction rather than being
 * cancelled. When `requestAnimationFrame` is undefined the call downgrades to a plain `setTimeout`,
 * which is what makes the hook usable during a server render.
 */
function setRafTimeout(callback: () => void, delay: number = 0): Handle {
  if (typeof requestAnimationFrame === 'undefined') {
    return {
      id: setTimeout(callback, delay),
    }
  }

  const handle: Handle = {
    id: 0,
  }

  const startTime = Date.now()

  function loop() {
    const current = Date.now()
    if (current - startTime >= delay) {
      callback()
    }
    else {
      handle.id = requestAnimationFrame(loop)
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
function cancelAnimationFrameIsNotDefined(_id: Handle['id']): _id is ReturnType<typeof setTimeout> {
  return typeof cancelAnimationFrame === 'undefined'
}

function clearRafTimeout(handle: Handle) {
  if (cancelAnimationFrameIsNotDefined(handle.id)) {
    clearTimeout(handle.id)
    return
  }
  cancelAnimationFrame(handle.id)
}

/**
 * Map from ahooks `useRafTimeout`
 * (`source/ahooks/packages/hooks/src/useRafTimeout/`).
 *
 * @example
 * const clear = useTimeoutRafFn(() => setVisible(false), 1000)
 * // later, before the deadline:
 * clear()
 *
 * @param fn Callback to run once, on the first frame at or after `delay`.
 * @param delay Milliseconds to wait. `undefined`, `NaN` or a negative number
 * disables the timeout.
 * @returns `clear`, a referentially stable function that cancels the pending
 * timeout. It returns nothing.
 */
export function useTimeoutRafFn(fn: () => void, delay: number | undefined): () => void {
  const fnRef = useLatest(fn)
  const timerRef = useRef<Handle | undefined>(undefined)

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearRafTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isNumber(delay) || delay < 0) {
      return
    }
    timerRef.current = setRafTimeout(() => {
      fnRef.current()
    }, delay)
    return clear
  }, [delay])

  return clear
}
