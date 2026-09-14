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

## Type Declarations

```ts
type Effect<T extends DependencyList> = (
  changes?: number[],
  previousDeps?: T,
  currentDeps?: T,
) => void | (() => void)
/**
 * React port of ahooks' `useTrackedEffect`.
 *
 * Map from ahooks `useTrackedEffect`
 * (`source/ahooks/packages/hooks/src/useTrackedEffect/`). Mirrored 1:1: a plain
 * `useEffect` whose callback additionally receives **which** dependencies moved,
 * as an ascending list of indexes into the dependency array, so one effect that
 * refetches several things can react only to the one that actually changed.
 * Upstream default-exports the hook; reause exports it as a named export, the
 * convention for these mirrors.
 *
 * **The changed-index list is the contract, and these are the pin's exact
 * semantics, measured rather than assumed:**
 *
 * - Elements are compared with `Object.is`, so `NaN` counts as *unchanged* (a
 *   `!==` comparison would report it) while `+0` → `-0` counts as changed.
 * - Comparison is by reference: an element whose identity is stable is
 *   unchanged even when its contents are mutated.
 * - **On the first run `changes` is every index of `deps`** — `[0, 1, …]` — when
 *   `deps` is passed, because the stored previous list starts `undefined` and
 *   the fallback branch enumerates the current list. It is *not* `undefined`;
 *   the effect's parameters are optional in the type only. When `deps` is
 *   omitted, `changes` is always `[]` and the effect runs after every render.
 * - The list is built by iterating the **previous** deps. If the current array
 *   is shorter, `changes` can name an index the current deps do not have; if it
 *   is longer, the added trailing indexes are never reported. React itself
 *   compares only the shared prefix (and logs a dev error when the size
 *   changes), so a size change alone does not even re-run the effect.
 *
 * The effect is called as `effect(changes, previousDeps, currentDeps)`: the
 * second argument is the deps of the previous run (`undefined` on the first),
 * the third the deps of this run. The stored deps are assigned **before** the
 * effect is invoked; the observable consequence under `<StrictMode>` is that the
 * double-invoked mount effect reports `[0, 1, …]` on its first invocation and
 * `[]` on its second, because the ref already holds the deps by then.
 *
 * The effect's return value is forwarded unchanged as the cleanup, so
 * `void | (() => void)` behaves exactly as it does for `useEffect`.
 *
 * `deps` is typed `[...T]` — a tuple — so the hook infers the caller's literal
 * dependency list positionally and the indexes in `changes` line up with it.
 *
 * Not `useUpdateEffect` (#940): that hook **skips** the mount and has no
 * `changes` argument, while this one runs on mount and reports every index
 * there.
 *
 * SSR-safe: nothing touches `window`/`document`, at import time or on first
 * render — the render phase is `useRef` alone and all work happens in the
 * passive effect.
 *
 * @example
 * useTrackedEffect((changes) => {
 *   if (changes?.includes(0)) refetchA()
 *   if (changes?.includes(1)) refetchB()
 * }, [a, b])
 */
export declare function useTrackedEffect<T extends DependencyList>(
  effect: Effect<T>,
  deps?: [...T],
): void
```
