---
category: Lifecycle
---

# useUnmountedRef

A ref that reports whether the component has unmounted — React port of ahooks' [`useUnmountedRef`](https://ahooks.js.org/hooks/use-unmounted-ref) (`source/ahooks/packages/hooks/src/useUnmountedRef/`; upstream exports it as the **default** export, reause exports the hook as a **named** export).

## Usage

```tsx
import { useUnmountedRef } from '@reause/shared'

const unmountedRef = useUnmountedRef() // { current: boolean }

async function load() {
  const data = await fetchData()
  // `.current` is false while mounted and true once the component has unmounted
  if (unmountedRef.current)
    return
  setData(data)
}
```

The return value is an explicit `{ current: boolean }` container, not a `MutableRefObject` — the hook never mutates through any other path, so the narrower type is what callers get. Nothing touches `window` or `document`, at import time or on first render: the initial value comes from `useRef(false)` alone, so server rendering is safe.

**Timing is the contract.** The flag flips in a **passive** effect (`useEffect` cleanup), not during render and not in a layout effect. Reading it from an async callback that resumes after the unmount always observes `true`, which is the point of returning a ref rather than a boolean. It does not flip synchronously at unmount time, though: a read taken in the same task as the unmount, before React flushes passive effects, can still observe `false`. When another hook in the same component reads `.current` from _its own_ empty-dependency passive cleanup, the flip has already happened and the read is `true`.

The mount effect re-initialises `.current = false`, and that is load bearing. `StrictMode` double-invokes effects on mount (mount → cleanup → mount), so the second invocation is what resets the flag after the simulated cleanup set it to `true`; a cleanup-only implementation would leave a `StrictMode` app permanently reporting `true`. The ref _object_ is stable across the whole double invocation. A remount is a genuinely fresh instance that starts `false` again, while the previous instance's ref keeps reporting `true`.

**Not the same hook as `@reause/core`'s `useMounted`.** `useMounted` (a VueUse port) returns a **boolean for the current render** — `false` during the first render, `true` afterwards — and it never flips back, so after unmount it is frozen at whatever the last render saw. `useUnmountedRef` returns a **ref you can read after the component is gone**; that post-unmount readability is the whole reason it exists, and it is why a callback that outlives the render (an async continuation, a timer) needs this hook and not a boolean.

## Type Declarations

```ts
/**
 * React port of ahooks' `useUnmountedRef`.
 *
 * Map from ahooks `useUnmountedRef`
 * (`source/ahooks/packages/hooks/src/useUnmountedRef/`). Mirrored 1:1: the
 * ref is created with `useRef(false)`, and an empty-dependency `useEffect`
 * re-initialises it to `false` on mount and flips it to `true` in its cleanup.
 *
 * The return type is the pin's runtime shape stated explicitly — a plain
 * `{ current: boolean }` container, not ahooks' `MutableRefObject<boolean>`
 * return **type**. No cast is involved: `useRef(false)` already yields an
 * object assignable to `{ current: boolean }`, and the narrower annotation
 * avoids advertising a `MutableRefObject` the hook never needs.
 *
 * **Timing is the contract, and it is a *passive* effect.** The ref flips in
 * `useEffect` cleanup, not in a layout effect and not during render. So after
 * the render that unmounts the component, `.current` becomes `true` when React
 * flushes passive effects for that commit — measured here as *before* a
 * parent's own empty-deps passive cleanup runs, which is the property that
 * makes "read `.current` from my cleanup and skip my own work" work. The
 * corollary is that it does **not** flip synchronously at unmount time: a
 * synchronous read taken in the same task as the unmount, before React flushes
 * passive effects, still observes `false`. Reading it from an async callback
 * (the point of returning a ref rather than a boolean) is always safe, because
 * such a callback resumes from a microtask or later — long after the commit.
 *
 * **StrictMode.** The mount effect's `unmountedRef.current = false` is load
 * bearing and must stay: StrictMode double-invokes effects on mount
 * (mount → cleanup → mount), and the second invocation is what resets the ref
 * back to `false` after the simulated cleanup set it to `true`. The ref
 * object* identity is stable across the whole double invocation, so a
 * cleanup-only implementation would leave a StrictMode app permanently
 * reporting `true`. The re-initialisation also means a value observed during
 * the simulated unmount window is not sticky.
 *
 * A remount is a genuinely fresh instance: the state is per-hook, so the new
 * instance's ref starts `false` again while the previous instance's ref keeps
 * reporting `true` (that retention after unmount is the point).
 *
 * SSR-safe: nothing touches `window`/`document`, at import time or on first
 * render — the initial value comes from `useRef(false)` alone.
 *
 * @example
 * const unmountedRef = useUnmountedRef()
 *
 * async function load() {
 *   const data = await fetchData()
 *   if (unmountedRef.current) return
 *   setData(data)
 * }
 *
 * @returns A ref object whose `current` is `false` while mounted and `true`
 * after the component has unmounted; keep the object and read it later.
 */
export declare function useUnmountedRef(): {
  current: boolean
}
```
