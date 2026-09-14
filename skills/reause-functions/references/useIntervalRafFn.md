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
export declare function useIntervalRafFn(
  fn: () => void,
  delay: number | undefined,
  options?: UseIntervalRafFnOptions,
): () => void
```
