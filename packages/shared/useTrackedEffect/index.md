---
category: Lifecycle
---

# useTrackedEffect

`useEffect` that also reports **which** dependencies changed — React port of ahooks' [`useTrackedEffect`](https://ahooks.js.org/hooks/use-tracked-effect) (`source/ahooks/packages/hooks/src/useTrackedEffect/`; upstream exports it as the **default** export, reause exports the hook as a **named** export).

## Usage

```tsx
import { useTrackedEffect } from '@reause/shared'

// one effect that refetches several things, reacting only to the dep that moved
useTrackedEffect((changes, previousDeps, currentDeps) => {
  if (changes?.includes(0))
    refetchA()
  if (changes?.includes(1))
    refetchB()
}, [a, b])
```

The callback receives three arguments: `changes`, the ascending indexes of the dependencies that changed; `previousDeps`, the dependency list of the previous run; and `currentDeps`, the list of this run. It runs like any `useEffect` — including on mount — and its return value is used as the cleanup.

The changed-index list is the contract, and its exact semantics are measured from the pinned source (`source/ahooks/packages/hooks/src/useTrackedEffect/index.ts`), not assumed:

- Elements are compared with `Object.is`, so a `NaN` that stays `NaN` counts as unchanged, while `+0` → `-0` counts as changed. Comparison is by reference: an object whose identity is stable is unchanged even when its contents are mutated.
- **On the first run `changes` is every index of the dependency list** (`[0, 1, …]`), not `undefined` — the stored previous list starts empty, and the hook enumerates the current one. When `deps` is omitted, `changes` is always `[]` and the effect runs after every render.
- The list is built by iterating the **previous** deps. If the current array is shorter, `changes` can name an index the current deps do not have; if it is longer, the added trailing indexes are never reported. React itself only compares the shared prefix, so a change in the array size alone does not re-run the effect.

Nothing touches `window` or `document`, at import time or on first render — the render phase is the ref alone and all work happens in the passive effect, so server rendering is safe.

Not to be confused with `useUpdateEffect`: that hook **skips** the mount and has no `changes` argument, whereas this one runs on mount and reports every index there.
