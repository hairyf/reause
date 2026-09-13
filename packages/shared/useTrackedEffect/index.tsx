import type { DependencyList } from 'react'
import { useEffect, useRef } from 'react'

type Effect<T extends DependencyList> = (
  changes?: number[],
  previousDeps?: T,
  currentDeps?: T,
) => void | (() => void)

/**
 * The index list of the elements that differ between two dependency lists, by
 * reference equality (`Object.is`). Iterates `previousDeps` only, exactly as
 * upstream does — see the length caveat in the hook's JSDoc below.
 */
function diffTwoDeps(previousDeps?: DependencyList, nextDeps?: DependencyList): number[] {
  return previousDeps
    ? previousDeps
        .map((_, index) => (!Object.is(previousDeps[index], nextDeps?.[index]) ? index : -1))
        .filter(index => index >= 0)
    : nextDeps
      ? nextDeps.map((_, index) => index)
      : []
}

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
export function useTrackedEffect<T extends DependencyList>(effect: Effect<T>, deps?: [...T]): void {
  const previousDepsRef = useRef<T>(undefined)

  useEffect(() => {
    const changes = diffTwoDeps(previousDepsRef.current, deps)
    const previousDeps = previousDepsRef.current
    previousDepsRef.current = deps
    return effect(changes, previousDeps, deps)
  }, deps)
}
