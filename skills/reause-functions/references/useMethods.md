---
category: State
---

# useMethods

`useReducer` sugar — turn an object of pure state transitions into a state value plus one callable method per transition.

## Usage

```tsx
import { useMethods } from '@reause/shared'

interface Counter {
  count: number
}

const initialState: Counter = { count: 0 }

function createMethods(state: Counter) {
  return {
    reset: () => initialState,
    increment: () => ({ count: state.count + 1 }),
    decrement: () => ({ count: state.count - 1 }),
  }
}

function Counter() {
  const [state, { increment, decrement, reset }] = useMethods(createMethods, initialState)

  return (
    <div>
      <button onClick={decrement}>-</button>
      <span>{state.count}</span>
      <button onClick={increment}>+</button>
      <button onClick={reset}>reset</button>
    </div>
  )
}
```

`createMethods` receives the current state and returns one function per method name, each producing the **next** state. The hook's second tuple element wraps every one of those names in a `dispatch` call, so the wrapped methods return `void` — they dispatch, they do not compute. That asymmetry is upstream's public contract: `increment()` returns nothing, while the `increment` you wrote inside `createMethods` returns the next state.

The wrapper's whole argument list is **spread** into the method, so a call with several arguments arrives positionally rather than as one array. Because the upstream `CreateMethods` type declares each method as `(payload?: any) => T`, a method that wants those arguments positionally is written with a rest parameter (`(...args: number[]) => …`); a method declared with two required parameters is not assignable to that signature. The wrapped methods themselves are typed `(...payload: any) => void`, so passing several arguments at the call site is always allowed.

The set of wrapped methods is derived **once**, by calling `createMethods(initialState)` and taking `Object.keys` of the result. A method that appears only on a later state is therefore never wrapped — `methods.dec` stays `undefined` even after the state becomes one `createMethods` would give a `dec` for. That is upstream's behaviour, mirrored deliberately rather than "fixed" by reading the current state; the reducer, by contrast, does call `createMethods` with the current state on every dispatch.

Both arguments must be **referentially stable**. The reducer is memoised on `[createMethods]` and the wrapped set on `[createMethods, initialState]`, so an inline arrow or an inline object literal gets a new identity every render and re-creates the wrapped methods every render. Declare them at module scope, or hold them with `useCallback` / `useMemo`. `initialState`'s _value_ is read on the first render only, so changing it later never resets the state — but a new `initialState` **reference** still rebuilds the wrapped set.

Both types are `any`-carrying, exactly as upstream declares them (`payload?: any`, `(payload?: any) => T`, `(...payload: any) => void`); they are preserved rather than narrowed so the port stays signature-identical to the pin. For state transitions that need middleware, reach for the sibling `createReducer` instead.

Upstream mapping files: `source/react-use/src/useMethods.ts` and `source/react-use/docs/useMethods.md`.

## Type Declarations

```ts
/**
 * The factory a caller supplies: given the current state, return one function
 * per method name, each producing the **next** state.
 *
 * Mirrors the pin's mapped type verbatim; `M` is inferred from the returned
 * object's keys and is never named by the caller. Like upstream, this type stays
 * module-private — the `createReducer` port sets the same precedent for its
 * `Dispatch`/`Store`/`Middleware` aliases.
 */
type CreateMethods<M, T> = (state: T) => {
  [P in keyof M]: (payload?: any) => T
}
/**
 * The hook's second tuple element: one `dispatch`-backed function per key of
 * `M`. The created methods **return** the next state; the wrapped ones return
 * `void`, because they dispatch instead of computing. That asymmetry is
 * upstream's public contract and is preserved rather than smoothed over.
 */
type WrappedMethods<M> = {
  [P in keyof M]: (...payload: any) => void
}
/**
 * `useReducer` sugar: turn an object of pure state transitions into a state
 * value plus one callable method per transition — React port of react-use's
 * `useMethods`.
 *
 * Map from react-use `useMethods`
 *
 * Mapping: the pin is mirrored 1:1 in behaviour — a `useMemo`-ised reducer that
 * looks the dispatched action's method up by name and spreads the action's
 * payload into it, a second `useMemo` that wraps every action type in a
 * `dispatch` call, and the `[state, wrappedMethods]` tuple. Two upstream
 * properties are load-bearing and are kept exactly:
 *
 * - **the wrapped method set is derived from `createMethods(initialState)`
 *   alone.** `Object.keys` runs against the *initial* state, inside the
 *   `useMemo`, so a method that appears only on a later state is never wrapped —
 *   `wrappedMethods.dec` stays `undefined` even once the state would produce it.
 *   That is upstream's behaviour, not an oversight to "fix" by deriving from the
 *   current state; the suite pins it so the limitation is documented.
 * - **`payload` is spread into the method, not passed as one argument.** The
 *   wrapper dispatches `{ type, payload }` with `payload` the whole rest-args
 *   array, and the reducer calls `[action.type](...action.payload)`. So
 *   `inc(1, 2)` reaches `inc` as two arguments. Mirroring that is what makes
 *   multi-argument methods work at all.
 *
 * **Both `useMemo` dependency lists are load-bearing**, and the pin's are kept
 * verbatim (`[createMethods]` for the reducer, `[createMethods, initialState]`
 * for the wrappers). Nothing here memoises the caller's inputs: an inline
 * `createMethods` arrow or an inline `initialState` object gets a new identity
 * every render, which re-creates the wrapped method set every render. The suite
 * asserts that identity churn rather than hiding it, so a caller must pass
 * stable references (module scope, or `useCallback`/`useMemo`) exactly as they
 * must upstream. The issue's "`createMethods` must be referentially stable" is
 * the same consequence seen from the caller's side.
 *
 * Three deliberate surface differences from the pin, each forced by this repo:
 * - upstream ships `export default useMethods`; reause exports it by name so the
 *   `@reause/shared` barrel can re-export it (AGENTS.md §1.1's convention for
 *   these mirrors), as `createReducer` and `useLogger` do;
 * - upstream declares the hook as a top-level `const` arrow, which the enforced
 *   `antfu/top-level-function` rule rejects, so it is a `function` declaration;
 * - **the pin's explicit `useReducer<Reducer<T, Action>>(...)` does not compile
 *   here, and dropping its type arguments is the one type-level change.**
 *   `@types/react` 19.2.18 declares only `useReducer<S, A extends AnyActionArg>`
 *   and `useReducer<S, I, A>`; the single-type-parameter `R extends Reducer<any,
 *   any>` overload the pin relied on is gone, so the pin's call is `TS2558:
 *   Expected 2 type arguments, but got 1`. The state and action types are
 *   therefore inferred from the `useMemo<Reducer<T, Action>>` annotation the pin
 *   still carries verbatim, and an exact-type check measured the result as
 *   `state: T` and `dispatch: (action: Action) => void` — the pair the explicit
 *   form asked for. `useReducer<T, [Action]>(...)`, React 19's generic
 *   positions, is type-identical and was the alternative; it was rejected only
 *   because it invents a rest-tuple spelling the pin never had. No cast was
 *   added to silence any of this.
 *
 * **The pin's body is also uncompilable verbatim under this repo's
 * `strict: true`.** Upstream's own `source/react-use/tsconfig.json` sets
 * `"noImplicitAny": false`, which is what lets it index a `keyof M` mapped type
 * with a plain `string`. Here that is `TS7053`, so the two lookups name the view
 * they need instead of asserting it: `createMethods(reducerState)` is annotated
 * `Record<string, (payload?: any) => T>` and the wrapper accumulator
 * `Record<string, (...payload: any[]) => void>`, with the wrapper's rest
 * parameter annotated `any[]` (`TS7019` in the pin) — which is exactly what
 * `WrappedMethods<M>` already declares. This is the disposition `createReducer`
 * records for strict mode's implicit `any`, and it keeps the assertion count at
 * the pin's one: upstream's `{} as WrappedMethods<M>` becomes the same
 * `as WrappedMethods<M>` on the `reduce` result, with no new assertion added.
 *
 * `any` is kept verbatim throughout (`payload?: any`, `(payload?: any) => T`,
 * `(...payload: any) => void`), matching the pin and AGENTS.md §1.1's
 * "completely preserve upstream's API" rule for react-use mirrors.
 *
 * Related: `createReducer` (this package) is the middleware-capable sibling —
 * reach for it when the transitions need middleware, and for `useMethods` when
 * they do not.
 *
 * @param createMethods Pure transitions, one per method name, each returning the
 * next state. Must be referentially stable: a new identity re-creates the
 * reducer and the wrapped method set. The wrapped names are computed once, from
 * the object it returns for `initialState`.
 * @param initialState The reducer's initial state. Also read once, to derive the
 * wrapped method names, so it too must be referentially stable for the wrappers
 * to keep their identity — changing its *value* later has no effect on state.
 * @returns A `[state, wrappedMethods]` tuple: the current state, and one
 * `dispatch`-backed `void` function per wrapped method name.
 *
 * @example
 * interface Counter { count: number }
 *
 * const initialState: Counter = { count: 0 }
 *
 * function createMethods(state: Counter) {
 *   return {
 *     reset: () => initialState,
 *     increment: () => ({ count: state.count + 1 }),
 *     decrement: () => ({ count: state.count - 1 }),
 *   }
 * }
 *
 * function Counter() {
 *   const [state, { increment, decrement }] = useMethods(createMethods, initialState)
 *
 *   return <button onClick={increment}>{state.count}</button>
 * }
 *
 * Upstream mapping files: `source/react-use/src/useMethods.ts` (41 LOC) and
 * `source/react-use/docs/useMethods.md`. The pin ships no test file — the pinned
 * tree holds no `*.test.*` under `src/` — so the suite here was written against
 * the contract above rather than translated from upstream.
 */
export declare function useMethods<M, T>(
  createMethods: CreateMethods<M, T>,
  initialState: T,
): [T, WrappedMethods<M>]
```
