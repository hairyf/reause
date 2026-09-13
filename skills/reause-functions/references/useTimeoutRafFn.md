---
category: Animation
---

# useTimeoutRafFn

Fire a callback once on the first animation frame at or after a delay, then stop

## Usage

```tsx
import { useTimeoutRafFn } from '@reause/shared'

const clear = useTimeoutRafFn(() => {
  /* runs once, on the first frame at or after 1000ms */
}, 1000)

// cancel the pending timeout before the deadline
clear()
```

This is the reause port of ahooks' `useRafTimeout` (`source/ahooks/packages/hooks/src/useRafTimeout/index.ts`, and its docs `index.en-US.md` / `index.zh-CN.md`), renamed to `useTimeoutRafFn` so it sits beside the existing `useTimeoutFn` in `@reause/shared`. The rename is the only API change: upstream default-exports the hook, reause exports it by name, and the signature is `useTimeoutRafFn(fn: () => void, delay: number | undefined): () => void` — it returns `clear`, a referentially stable function that cancels the pending frame-aligned timeout and returns nothing. It is not a duplicate of `useTimeoutFn` (VueUse's `useTimeoutFn`, also in this package): that one is a plain `setTimeout` with controls — it returns `{ isPending, start, stop }` and you can restart it as often as you like — while this is the frame-aligned variant, which fires only while the page is actually rendering, runs exactly once, and can only be cleared, never restarted. Because the callback runs on an animation frame, it pauses with the page (hidden or minimized tabs get no frames) instead of firing on a throttled wall clock; when `requestAnimationFrame` is unavailable — a server render, for instance — the hook downgrades to `setTimeout(fn, delay)`. A `delay` of `undefined` or `NaN`, or any negative number, disables the timeout entirely: nothing is scheduled and nothing fires. The callback is read through this package's `useLatest`, so passing a fresh inline function on every render neither restarts the timer nor makes a stale closure fire; only a changed `delay` re-arms it. There is no `useTimeoutRafFn` documentation page upstream to mirror beyond the two files above (the ahooks GitHub page for the hook was not fetched while writing this port, so its live rendering is unverified).

## Type Declarations

```ts
/**
 * Fire `fn` once, on the first animation frame at or after `delay`
 * milliseconds, and return a stable `clear` that cancels the pending timeout.
 *
 * Map from ahooks `useRafTimeout`
 * (`source/ahooks/packages/hooks/src/useRafTimeout/`). Mirrored directly
 * (AGENTS.md §1.1, React source ⇒ direct mirror) apart from the required
 * rename to `useTimeoutRafFn`, which aligns the export with the existing
 * `useTimeoutFn` in `@reause/shared`; the JSDoc marker keeps upstream's symbol
 * name. Upstream ships this hook as a default export, reause exports it by
 * name.
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
 * - **dual branch.** With no `requestAnimationFrame` (a server render, or any
 *   frame-less host) the timeout downgrades to `setTimeout(fn, delay)`. The
 *   clear path mirrors upstream's classifier: it looks at
 *   `typeof cancelAnimationFrame`, so an environment that has one global but
 *   not the other mis-classifies the handle exactly as upstream does — a
 *   preserved quirk, not a divergence.
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
 * Not a duplicate of `useTimeoutFn` (VueUse's `useTimeoutFn`, also in
 * `@reause/shared`): that one is a plain `setTimeout` with controls
 * (`{ isPending, start, stop }`, manually restartable and re-armable as often
 * as wanted); this is the frame-aligned, one-shot variant — it fires only when
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
export declare function useTimeoutRafFn(
  fn: () => void,
  delay: number | undefined,
): () => void
```
