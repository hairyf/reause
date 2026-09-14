import type { IHookStateInitAction, IHookStateSetAction } from '../useList'
import { useMemo, useSyncExternalStore } from 'react'

/**
 * Resolve a value-or-action into its value, mirroring react-use's `resolveHookState`
 * (`source/react-use/src/misc/hookState.ts`) **including its arity rule**: a function action is
 * called with the current state only when it declares a parameter (`nextState.length ?
 * nextState(currentState): nextState()`), so a zero-argument action is invoked with no argument and
 * can only observe the state through `arguments`.
 *
 * Declared locally, like `useList`'s copy of the same private helper: reause has no
 * `misc/hookState` module to share one from, and the helper is not part of either module's public
 * surface. The two aliases the signatures need, by contrast, are *imported* from `useList` instead
 * of redeclared — a second `export *` of the same names would collide in the `@reause/shared`
 * barrel.
 */
function resolveHookState<S>(nextState: IHookStateInitAction<S> | IHookStateSetAction<S>, currentState?: S): S {
  if (typeof nextState !== 'function')
    return nextState

  const action = nextState as (prevState?: S) => S

  return action.length ? action(currentState) : action()
}

/**
 * Keep state in the global scope, reusable across React components — React port of react-use's
 * `createGlobalState`.
 *
 * Map from react-use `createGlobalState`
 * (source/react-use/src/factory/createGlobalState.ts)
 * Mapping:. The initial state is resolved **once**, when `createGlobalState` is called — module
 * scope, never during a render — and the zero-argument hook it returns yields upstream's `[state,
 * setState]` tuple: the current value plus a **single** setter shared by every consumer. `setState`
 * accepts a value, an updater or a zero-argument factory and resolves it through react-use's
 * `resolveHookState` arity rule (see above); the store is never disposed or reset, so the value
 * outlives every component that reads it. The overloads and the types they name are upstream's
 * verbatim — `<S = any>(initialState)` and `<S = undefined>()`, typed `IHookStateInitAction` /
 * `IHookStateSetAction` — so reause's former `GlobalStateInitAction` / `GlobalStateSetAction` /
 * `GlobalStateSetter` aliases are gone: this module exports `createGlobalState` and no
 * `State`-suffixed type. `IHookStateInitAction` / `IHookStateSetAction` are upstream's
 * `misc/hookState` names, imported from `useList` — react-use's own barrel does not re-export
 * either one, and reause declares each name once per package — so this port neither renames nor
 * re-derives them.
 *
 * Deviations from upstream:
 * - the store is a module-level external store (the value plus a `Set` of
 *   listeners) read through `useSyncExternalStore`, instead of upstream's
 *   per-consumer `useState` copy plus the `store.setters` array that
 *   `store.setState` pushes into. Observable behaviour is the same — one shared
 *   value, one shared setter, unmount-proof — but no consumer holds a private
 *   copy of the value, the layout-effect registration / `useEffectOnce`
 *   unregistration bookkeeping is gone, and a concurrent render reads the store
 *   through the API React provides for external stores rather than through a
 *   copy taken when that consumer mounted.
 * - the returned tuple is memoized on the snapshot, so its identity is stable
 *   across renders for a given state; upstream builds a fresh array on every
 *   render, so a memoized child or an effect keyed on the tuple churns there and
 *   not here.
 * - upstream resolves the initial state with `initialState instanceof Function`;
 *   this port uses `typeof initialState === 'function'`, which also accepts a
 *   function from another realm (an iframe, a worker) — the same function check
 *   the rest of the package uses for react-use's init actions.
 * - upstream ships `export default createGlobalState`; reause exports it by name
 *   so `packages/shared/index.ts` can re-export it from the `@reause/shared`
 *   barrel (AGENTS.md §1.1's named-export convention for these mirrors).
 *
 * VueUse ships a `createGlobalState` as well, but it is a **different API** — a variadic factory
 * that runs inside a detached effect scope and hands its shared refs back — and it is not this
 * port's upstream. Here the argument is react-use's initial state, and the hook takes no arguments
 * at all.
 *
 * ```ts
 * const useGlobalState = createGlobalState(() => 0)
 *
 * function Counter() {
 * const [count, setCount] = useGlobalState()
 * return <button onClick={() => setCount(prev => prev + 1)}>{count}</button>
 * }
 * ```
 *
 * Upstream mapping files: `source/react-use/src/factory/createGlobalState.ts` and
 * `source/react-use/docs/createGlobalState.md`.
 *
 * @see https://github.com/streamich/react-use/blob/master/src/factory/createGlobalState.ts
 * @see https://github.com/streamich/react-use/blob/master/docs/createGlobalState.md
 * @param initialState The initial state — a plain value or a zero-arg function
 * computing it; resolved exactly once, at `createGlobalState` call time.
 */
export function createGlobalState<S = any>(
  initialState: IHookStateInitAction<S>,
): () => [S, (state: IHookStateSetAction<S>) => void]
export function createGlobalState<S = undefined>(): () => [S, (state: IHookStateSetAction<S>) => void]
/* @__NO_SIDE_EFFECTS__ */
export function createGlobalState<S>(initialState?: S): () => [S, (state: IHookStateSetAction<S>) => void] {
  // resolved exactly once, at `createGlobalState` call time — upstream's
  // `store.state = initialState instanceof Function ? initialState() : initialState`.
  // Eager module-scope resolution means the initializer never runs during a
  // component render, and a zero-arg initializer runs exactly once even when it
  // returns `undefined`.
  let state = (typeof initialState === 'function' ? (initialState as () => S)() : initialState) as S

  const listeners = new Set<() => void>()

  // created once per `createGlobalState` call, so it is stable for every consumer
  // and every render — safe to hand straight to `useSyncExternalStore`
  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  const getSnapshot = (): S => state

  // a single setter shared by every consumer (upstream returns `store.setState`):
  // assigns then notifies every subscriber, never resets
  const setState = (update: IHookStateSetAction<S>): void => {
    state = resolveHookState(update, state)

    for (const listener of listeners)
      listener()
  }

  return function useGlobalState(): [S, (state: IHookStateSetAction<S>) => void] {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

    return useMemo(
      () => [snapshot, setState] as [S, (state: IHookStateSetAction<S>) => void],
      [snapshot, setState],
    )
  }
}
