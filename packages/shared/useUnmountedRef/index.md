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
