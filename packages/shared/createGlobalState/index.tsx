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
 * Map from react-use `createGlobalState` (source/react-use/src/factory/createGlobalState.ts).
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
