---
category: State
---

# createGlobalState

Keep state in the global scope, reusable across React components — React port of react-use's `createGlobalState`.

## Usage

```tsx
import { createGlobalState } from '@reause/shared'

// called once, at module scope: every component below reads the same state
const useGlobalValue = createGlobalState<number>(0)

function CompA() {
  const [value, setValue] = useGlobalValue()

  return <button onClick={() => setValue(value + 1)}>+</button>
}

function CompB() {
  const [value, setValue] = useGlobalValue()

  return <button onClick={() => setValue(value - 1)}>-</button>
}

function Demo() {
  const [value] = useGlobalValue()

  return (
    <div>
      <p>{value}</p>
      <CompA />
      <CompB />
    </div>
  )
}
```

The initial state can also be a function, and `setState` accepts an updater:

```tsx
const useGlobalValue = createGlobalState<number>(() => 0)

function CompA() {
  const [value, setValue] = useGlobalValue()

  return <button onClick={() => setValue(value => value + 1)}>+</button>
}
```

The argument is the **initial state**, resolved once when `createGlobalState` is called — at module scope, never during a render — so the hook the factory returns takes no arguments. Every consumer of that hook shares one value and one setter, and the store is module-wide and never disposed: unmounting and remounting a component reads back the value written before. `setState` takes a value, an updater `prev => next`, or a zero-argument `() => next`; following react-use's `resolveHookState`, a function action is called with the current state only when it declares a parameter.

Ported from react-use's `source/react-use/src/factory/createGlobalState.ts` and `source/react-use/docs/createGlobalState.md`. VueUse ships a `createGlobalState` too, but with a different API — a variadic factory that hands its shared refs back — and it is not this page's upstream: here the parameter is react-use's initial state.

## Type Declarations

```ts
/**
 * Keep state in the global scope, reusable across React components — React port
 * of react-use's `createGlobalState`.
 *
 * Map from react-use `createGlobalState`
 * (source/react-use/src/factory/createGlobalState.ts)
 * Mapping: mirrors upstream's factory and its public shape. The initial state is
 * resolved **once**, when `createGlobalState` is called — module scope, never
 * during a render — and the zero-argument hook it returns yields upstream's
 * `[state, setState]` tuple: the current value plus a **single** setter shared by
 * every consumer. `setState` accepts a value, an updater or a zero-argument
 * factory and resolves it through react-use's `resolveHookState` arity rule (see
 * above); the store is never disposed or reset, so the value outlives every
 * component that reads it. The overloads and the types they name are upstream's
 * verbatim — `<S = any>(initialState)` and `<S = undefined>()`, typed
 * `IHookStateInitAction` / `IHookStateSetAction` — so reause's former
 * `GlobalStateInitAction` / `GlobalStateSetAction` / `GlobalStateSetter` aliases
 * are gone: this module exports `createGlobalState` and no `State`-suffixed type.
 * `IHookStateInitAction` / `IHookStateSetAction` are upstream's `misc/hookState`
 * names, imported from `useList` — react-use's own barrel does not re-export
 * either one, and reause declares each name once per package — so this port
 * neither renames nor re-derives them.
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
 * VueUse ships a `createGlobalState` as well, but it is a **different API** — a
 * variadic factory that runs inside a detached effect scope and hands its shared
 * refs back — and it is not this port's upstream. Here the argument is react-use's
 * initial state, and the hook takes no arguments at all.
 *
 * ```ts
 * const useGlobalState = createGlobalState(() => 0)
 *
 * function Counter() {
 *   const [count, setCount] = useGlobalState()
 *   return <button onClick={() => setCount(prev => prev + 1)}>{count}</button>
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
export declare function createGlobalState<S = any>(
  initialState: IHookStateInitAction<S>,
): () => [S, (state: IHookStateSetAction<S>) => void]
export declare function createGlobalState<S = undefined>(): () => [
  S,
  (state: IHookStateSetAction<S>) => void,
]
```
