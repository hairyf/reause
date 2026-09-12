import { useMemo } from 'react'

/**
 * Turn a pure function into a memoising hook — React port of react-use's
 * `createMemo`.
 *
 * Map from react-use `createMemo`
 * Mapping: mirrors upstream 1:1 (8 lines) — the factory closes over `fn` and
 * returns a function that calls `useMemo` with the **raw `args` as the
 * dependency list**. Two surface differences only:
 * - upstream ships `export default createMemo`; reause exports it by name so
 *   `packages/shared/index.ts` can re-export it from the `@reause/shared`
 *   barrel — the repo's named-export convention (AGENTS.md §1.1), which keeps
 *   the upstream API shape (argument types, return value) identical;
 * - upstream declares the factory as a top-level `const` arrow, which this
 *   repo's enforced `antfu/top-level-function` rule rejects, so the factory is
 *   a `function` declaration — like every other factory in the package
 *   (`createGlobalState`, `createInjectionState`, `createEventHook`). The
 *   returned function keeps upstream's anonymous arrow shape exactly.
 *
 * The returned function **is a hook** — it calls `useMemo` — so call the
 * factory once, at module scope, and bind the result to a `useXxx` name; only
 * then does React's Rules of Hooks accept it at a call site:
 *
 * ```ts
 * const useFullName = createMemo((first: string, last: string) => `${first} ${last}`)
 *
 * function Profile({ first, last }: { first: string, last: string }) {
 *   const fullName = useFullName(first, last)
 * }
 * ```
 *
 * Dependencies are the raw `args`, compared by **reference equality**, exactly
 * like upstream. The memoised body re-runs whenever an argument is a new
 * reference, even when it is structurally equal: pass a fresh object, array or
 * callback on every render and `createMemo` degenerates into an unmemoised
 * call. Callers must pass **already-stable arguments** (a state value, a module
 * constant, a `useMemo`d object). Deliberately *not* "fixed" by cloning or
 * deep-comparing the arguments here — that would silently diverge from
 * upstream's dependency semantics.
 *
 * Not to be confused with `useMemoize` (@reause/core), the VueUse port: that
 * one is a **persistent cache keyed by the arguments**, shared across calls and
 * components, while `createMemo` is a render-scoped `useMemo` wrapper — the
 * value is recomputed per mounting component and nothing is cached after it
 * unmounts.
 *
 * Upstream mapping files: `source/react-use/src/factory/createMemo.ts` and
 * `source/react-use/docs/createMemo.md`.
 *
 * @see https://github.com/streamich/react-use/blob/master/src/factory/createMemo.ts
 * @see https://github.com/streamich/react-use/blob/master/docs/createMemo.md
 */
/* @__NO_SIDE_EFFECTS__ */
export function createMemo<T extends (...args: any) => any>(
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> =>
    useMemo<ReturnType<T>>(() => fn(...args), args)
}
