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
 * Fire `fn` once, on the first animation frame at or after `delay` milliseconds, and return a
 * stable `clear` that cancels the pending timeout.
 *
 * Map from ahooks `useRafTimeout`
 * (`source/ahooks/packages/hooks/src/useRafTimeout/`). Mirrored directly
 * (AGENTS.md §1.1, React source ⇒ direct mirror) apart from the required rename to
 * `useTimeoutRafFn`, which aligns the export with the existing `useTimeoutFn` in `@reause/shared`;
 * the JSDoc marker keeps upstream's symbol name. Upstream ships this hook as a default export,
 * reause exports it by name.
 *
 * Semantics worth stating, because they differ from the interval sibling:
 * - **one-shot.** `startTime` is captured once when the timeout is armed and is
 *   never reset, so the loop fires exactly once and then stops. It is not a
 *   repeating interval that is merely cancelled — no frame is pending after the
 *   callback ran.
 * - **clock source: `Date.now()`.** The elapsed time is measured with
 *   `Date.now()`, deliberately *not* with `performance.now()` and not with the
 *   frame timestamp `requestAnimationFrame` passes to its callback. The
 *   deadline is therefore wall-clock-ish and keeps counting while frames are
 *   throttled, and the callback fires on the first frame delivered after it.
 * - **the comparison is `>=`**, so a `delay` of `0` fires on the very first
 *   frame.
 * - **disabling condition: `!isNumber(delay) || delay < 0`.** `undefined`,
 *   `NaN` and any negative number return before arming anything, so nothing is
 *   scheduled and nothing can fire. Changing `delay` to such a value cancels
 *   the timeout armed by the previous value (effect cleanup).
 * - **dual branch.** With no `requestAnimationFrame` (a server render, or any frame-less host) the
 * timeout downgrades to `setTimeout(fn, delay)`. The clear path, so an environment that has one
 * global but not the other mis-classifies the handle, not a divergence.
 * - **`fn` is read through `@reause/shared`'s `useLatest`** (the merged
 *   react-use port), and the arming effect depends on `delay` alone. A
 *   re-render carrying a new inline callback therefore neither restarts the
 *   timer nor fires a stale closure: the newest `fn` runs when the deadline is
 *   reached. No copy of `useLatest` is inlined here.
 * - **shared plumbing is deliberately local.** The frame loop lives in this
 *   file instead of a cross-hook helper because its only planned consumer,
 *   the interval sibling `useIntervalRafFn` (#941), does not exist yet.
 *   Extracting a shared draw-loop helper is deferred until #941 lands, rather
 *   than invented here for a single caller.
 *
 * Not a duplicate of `useTimeoutFn` (VueUse's `useTimeoutFn`, also in `@reause/shared`): that one
 * is a plain `setTimeout` with controls (`{ isPending, start, stop }`, manually restartable and
 * re-armable as often as wanted); this is the frame-aligned, one-shot variant — it fires only when
 * the page is actually rendering and cannot be restarted, only cleared.
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
