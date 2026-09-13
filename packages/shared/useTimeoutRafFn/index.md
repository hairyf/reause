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
