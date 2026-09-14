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
 * Fire `fn` repeatedly, on animation frames, once at least `delay` milliseconds have elapsed since
 * the last fire; return a stable `clear` that cancels the running loop.
 *
 * Map from ahooks `useRafInterval`
 * (`source/ahooks/packages/hooks/src/useRafInterval/`). Mirrored directly
 * (AGENTS.md §1.1, React source ⇒ direct mirror) apart from the required rename to
 * `useIntervalRafFn`, which aligns the export with the existing `useIntervalFn` in
 * `@reause/shared`; the JSDoc marker keeps upstream's symbol name. Upstream ships this hook as a
 * default export with an inline options type, reause exports it by name behind
 * `UseIntervalRafFnOptions`.
 *
 * Semantics worth stating, because they differ from the timeout sibling:
 * - **repeating.** `start` is captured when the loop is armed and then reset to
 *   `Date.now()` after every callback, so the deadline advances and the loop
 *   fires again and again until `clear()` (or unmount, or a `delay` change)
 *   stops it. `useTimeoutRafFn` is the one-shot sibling: there `startTime` is
 *   captured once and never reset, so it fires exactly once and schedules no
 *   further frame. Same frame loop shell, opposite loop body — the reason the
 *   two are not sharing a helper (see below).
 * - **period is `delay` rounded up to the next frame boundary.** Because the
 *   clock is only read once per frame and the deadline restarts after the fire,
 *   a `delay` that is not a whole multiple of the frame period produces an
 *   effective period of the next whole frame boundary, never a shorter one.
 *   Measured here: with 16ms frames, `delay: 50` fires on frames 4, 8, 12 … —
 *   every 64ms, not every 50ms.
 * - **clock source: `Date.now()`.** The elapsed time is measured with
 *   `Date.now()`, deliberately *not* with `performance.now()` and not with the
 *   frame timestamp `requestAnimationFrame` passes to its callback. The
 *   deadline is therefore wall-clock-ish and keeps counting while frames are
 *   throttled, and the callback fires on the first frame delivered after it.
 * - **the comparison is `>=`**, so a `delay` of `0` fires on every frame.
 * - **disabling condition: `!isNumber(delay) || delay < 0`.** `undefined`,
 *   `NaN` and any negative number return before arming anything, so nothing is
 *   scheduled and nothing can fire. Changing `delay` to such a value cancels
 *   the loop armed by the previous value (effect cleanup).
 * - **`immediate`.** When true, `fn` runs once synchronously inside the arming
 *   effect, before the first frame is requested. It is read on every render but
 *   the arming effect depends on `delay` alone, so flipping `immediate` on a
 *   later render neither fires again nor restarts the loop — upstream behaves
 *   the same way.
 * - **dual branch.** With no `requestAnimationFrame` (a server render, or any frame-less host) the
 * loop downgrades to `setInterval(fn, delay)`. The clear path, so an environment that has one
 * global but not the other mis-classifies the handle, not a divergence.
 * - **`fn` is read through `@reause/shared`'s `useLatest`** (the merged
 *   react-use port), and the arming effect depends on `delay` alone. A
 *   re-render carrying a new inline callback therefore neither restarts the
 *   loop nor fires a stale closure: the newest `fn` runs on the next fire. No
 *   copy of `useLatest` is inlined here.
 * - **shared plumbing is deliberately local.** The frame loop lives in this
 *   file, next to the timeout sibling's, because the two bodies do opposite
 *   things with the same shell: this one re-arms unconditionally and resets the
 *   deadline after firing, `useTimeoutRafFn` re-arms only while the deadline is
 *   unmet and never resets it. The genuinely shared part is two calls — the
 *   `typeof requestAnimationFrame === 'undefined'` branch and the
 *   `cancelAnimationFrameIsNotDefined` classifier — which is roughly ten lines
 *   of straight-line code. A helper covering those two calls would need a
 *   callback or a `repeat` flag to carry the difference that matters, and
 *   `useTimeoutRafFn`'s suite would have to keep passing through an indirection
 *   it does not currently have. Measured against the real code, the extraction
 *   buys nothing: it trades ten duplicated lines for an abstraction with a mode
 *   flag and an extra sanctioned import path. Not extracted; both hooks stay
 *   self-contained. (The `packages/core` option is not available anyway —
 *   `core` depends on `shared`, so a helper there could not be imported from
 *   here.)
 *
 * Not a duplicate of `useIntervalFn` (VueUse's `useIntervalFn`, also in `@reause/shared`): that one
 * is a plain `setInterval` returning controls (`{ isActive, pause, resume }`) and fires on the wall
 * clock even in a hidden tab, while this is frame-aligned — it only runs when the page actually
 * renders — and returns a single stable `clear`. It is also not `packages/core`'s `useRafFn`
 * (VueUse's per-frame callback with pause/resume): that one runs on *every* frame with no delay at
 * all.
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
