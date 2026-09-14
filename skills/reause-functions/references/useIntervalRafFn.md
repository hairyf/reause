---
category: Animation
---

# useIntervalRafFn

Fire a callback repeatedly on animation frames, at a delay rounded up to the next frame

## Usage

```tsx
import { useIntervalRafFn } from '@reause/shared'

const clear = useIntervalRafFn(() => {
  /* runs again and again, on the first frame at or after 1000ms since the last run */
}, 1000)

// stop the loop
clear()
```

This is the reause port of ahooks' `useRafInterval` (`source/ahooks/packages/hooks/src/useRafInterval/index.ts`, with upstream's docs `index.en-US.md` / `index.zh-CN.md`, its `demo/demo1.tsx` / `demo/demo2.tsx` and its `__tests__/index.spec.ts` / `__tests__/node.spec.ts`), renamed to `useIntervalRafFn` so it sits beside the existing `useIntervalFn` in `@reause/shared`. The rename is the only API change: upstream default-exports the hook, reause exports it by name, and the signature is `useIntervalRafFn(fn: () => void, delay: number | undefined, options?: { immediate?: boolean }): () => void` — it returns `clear`, a referentially stable function that cancels the running loop and returns nothing, and `options.immediate` runs `fn` once synchronously before the first frame is requested. The loop is **repeating**, which is what separates it from its sibling `useTimeoutRafFn`: that one captures its start time once and never resets it, so it fires exactly once and then schedules no further frame, while this one resets its start time after every fire, so the deadline moves forward and the loop keeps firing until something clears it. The reset happens _after_ the callback, so the effective period is `delay` rounded **up** to the next frame boundary rather than an exact `delay` — at 60fps with a 50ms delay it fires every 64ms, not every 50ms — and because the elapsed time is measured with `Date.now()` rather than the frame timestamp, a throttled page simply fires later instead of skipping the deadline. The `>=` deadline comparison means a `delay` of `0` fires on every frame. A `delay` of `undefined` or `NaN`, or any negative number, disables the loop entirely: nothing is scheduled and nothing fires. Because the callback runs on an animation frame, the loop pauses with the page (hidden or minimized tabs get no frames) instead of firing on a throttled wall clock; when `requestAnimationFrame` is unavailable — a server render, for instance — the hook downgrades to `setInterval(fn, delay)`. The callback is read through this package's `useLatest`, so passing a fresh inline function on every render neither restarts the loop nor makes a stale closure fire; only a changed `delay` re-arms it. Not to be confused with `useIntervalFn` (VueUse's `useIntervalFn`, also in `@reause/shared`), which is a plain `setInterval` returning `{ isActive, pause, resume }` and fires on the wall clock even in a hidden tab, nor with `@reause/core`'s `useRafFn` (VueUse's `useRafFn`), which runs a callback on _every_ frame with no delay and exposes pause/resume. Upstream files beyond those listed above were not fetched while writing this port, so nothing here is claimed about the upstream documentation site's live rendering.

## Type Declarations

```ts
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
 * Fire `fn` repeatedly, on animation frames, once at least `delay` milliseconds
 * have elapsed since the last fire; return a stable `clear` that cancels the
 * running loop.
 *
 * Map from ahooks `useRafInterval`
 * (`source/ahooks/packages/hooks/src/useRafInterval/`). Mirrored directly
 * (AGENTS.md §1.1, React source ⇒ direct mirror) apart from the required
 * rename to `useIntervalRafFn`, which aligns the export with the existing
 * `useIntervalFn` in `@reause/shared`; the JSDoc marker keeps upstream's symbol
 * name. Upstream ships this hook as a default export with an inline options
 * type, reause exports it by name behind `UseIntervalRafFnOptions`.
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
 * - **dual branch.** With no `requestAnimationFrame` (a server render, or any
 *   frame-less host) the loop downgrades to `setInterval(fn, delay)`. The clear
 *   path mirrors upstream's classifier: it looks at
 *   `typeof cancelAnimationFrame`, so an environment that has one global but
 *   not the other mis-classifies the handle exactly as upstream does — a
 *   preserved quirk, not a divergence.
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
 * Not a duplicate of `useIntervalFn` (VueUse's `useIntervalFn`, also in
 * `@reause/shared`): that one is a plain `setInterval` returning controls
 * (`{ isActive, pause, resume }`) and fires on the wall clock even in a hidden
 * tab, while this is frame-aligned — it only runs when the page actually
 * renders — and returns a single stable `clear`. It is also not
 * `packages/core`'s `useRafFn` (VueUse's per-frame callback with
 * pause/resume): that one runs on *every* frame with no delay at all.
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
export declare function useIntervalRafFn(
  fn: () => void,
  delay: number | undefined,
  options?: UseIntervalRafFnOptions,
): () => void
```
