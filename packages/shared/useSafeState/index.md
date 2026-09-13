---
category: State
---

# useSafeState

A `useState` whose setter is a no-op once the component has unmounted — React port of ahooks' [`useSafeState`](https://ahooks.js.org/hooks/use-safe-state) (`source/ahooks/packages/hooks/src/useSafeState/`; upstream exports it as the **default** export, reause exports the hook as a **named** export).

## Usage

```tsx
import { useSafeState } from '@reause/shared'

const [value, setValue] = useSafeState(0)

async function load() {
  const data = await fetchData()
  // ignored if the component unmounted while the request was in flight
  setValue(data)
}
```

`setValue` is referentially stable for the lifetime of the component and simply returns early while `useUnmountedRef().current` is `true`, so a late update from an async continuation or timer never reaches `useState`. The initial state may be a lazy factory — `useSafeState(() => 42)` — exactly as with `useState`, because the argument is handed straight to it. The zero-argument overload returns `[S | undefined, …]`, so `useSafeState<string>()` starts `undefined`.

**Functional updates work.** The setter is typed `Dispatch<SetStateAction<S>>`, and that promise holds at runtime: `setValue(previous => previous + 1)` is invoked by React as a real updater against the latest state, not stored as the state value. That is measured rather than assumed — under React 19 in chromium, an updater called from `10` runs once and commits the `number` `11` (never a function), and two batched updaters from `{ n: 1 }` observe `{ n: 1 }` then `{ n: 2 }`, committing `{ n: 3 }` in a single re-render. The one case no runtime setter can treat as an updater is a state type that is _itself_ a function — the standard functional-update caveat, shared with `useState`.

**The guard is a passive-effect timing contract.** The unmount flag flips in `useUnmountedRef`'s `useEffect` cleanup, so it is reliable for a callback that resumes after the unmount, which is when the flag is actually needed. It is not synchronous with unmount: a call issued in the same task as the unmount, before passive effects flush, can still reach `useState`. React silently ignores a state update on an unmounted component, so the visible result is the same — the ref just makes the intent explicit and skips the work. Note the consequence for the updater form: because the guard runs _before_ `setState`, an updater passed after unmount is **not invoked at all**.

Ported from ahooks' `source/ahooks/packages/hooks/src/useSafeState/index.ts` (23 LOC), its `index.en-US.md` / `index.zh-CN.md` docs, and its `__tests__/index.spec.ts`.

Different from the neighbouring `useStateAutoReset` / `useStateManualReset` (VueUse ports) and `useStateDefault` / `useStateWithControl`: those shape _when_ state resets or changes, while `useSafeState` keeps plain `useState` semantics and only decides _whether a setter call is allowed to land_ after unmount.
