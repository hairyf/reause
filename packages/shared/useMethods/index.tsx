import type { Reducer } from 'react'
import { useMemo, useReducer } from 'react'

/**
 * The action a wrapped method dispatches: the method's name in `type`, and the wrapper's **whole
 * argument list** in `payload`.
 *
 * `payload` is the rest-args array, not a single argument — the reducer spreads it back into the
 * method (`...action.payload`), which is what makes `increment(1, 2)` reach `increment` as two
 * arguments rather than one array. Both `any`s are the pin's, kept verbatim; this repo's eslint
 * config carries no `no-explicit-any` rule. The pin declares this shape as a `type` alias, which
 * the enforced `ts/consistent-type-definitions` rule rejects for an object literal; it is an
 * `interface` here, the same form `createReducer` uses for its `Store`.
 */
interface Action {
  type: string
  payload?: any
}

/**
 * The factory a caller supplies: given the current state, return one function per method name, each
 * producing the **next** state.
 *
 * Mirrors the pin's mapped type verbatim; `M` is inferred from the returned object's keys and is
 * never named by the caller. Like upstream, this type stays module-private — the `createReducer`
 * port sets the same precedent for its `Dispatch`/`Store`/`Middleware` aliases.
 */
type CreateMethods<M, T> = (state: T) => {
  [P in keyof M]: (payload?: any) => T
}

/**
 * The hook's second tuple element: one `dispatch`-backed function per key of `M`. The created
 * methods **return** the next state; the wrapped ones return `void`, because they dispatch instead
 * of computing. That asymmetry is upstream's public contract and is preserved rather than smoothed
 * over.
 */
type WrappedMethods<M> = {
  [P in keyof M]: (...payload: any) => void
}

/**
 * `useReducer` sugar: turn an object of pure state transitions into a state value plus one callable
 * method per transition — React port of react-use's `useMethods`.
 *
 * Map from react-use `useMethods`
 *
 * Mapping: the pin is mirrored 1:1 in behaviour — a `useMemo`-ised reducer that looks the
 * dispatched action's method up by name and spreads the action's payload into it, a second
 * `useMemo` that wraps every action type in a `dispatch` call, and the `[state, wrappedMethods]`
 * tuple. Two upstream properties are load-bearing and are kept exactly:
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
 * **Both `useMemo` dependency lists are load-bearing**, and the pin's are kept verbatim
 * (`[createMethods]` for the reducer, `[createMethods, initialState]` for the wrappers). Nothing
 * here memoises the caller's inputs: an inline `createMethods` arrow or an inline `initialState`
 * object gets a new identity every render, which re-creates the wrapped method set every render.
 * The suite asserts that identity churn rather than hiding it, so a caller must pass stable
 * references (module scope, or `useCallback`/`useMemo`) exactly as they must upstream. The issue's
 * "`createMethods` must be referentially stable" is the same consequence seen from the caller's
 * side.
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
 * **The pin's body is also uncompilable verbatim under this repo's `strict: true`.** Upstream's own
 * `source/react-use/tsconfig.json` sets `"noImplicitAny": false`, which is what lets it index a
 * `keyof M` mapped type with a plain `string`. Here that is `TS7053`, so the two lookups name the
 * view they need instead of asserting it: `createMethods(reducerState)` is annotated
 * `Record<string, (payload?: any) => T>` and the wrapper accumulator `Record<string, (...payload:
 * any[]) => void>`, with the wrapper's rest parameter annotated `any[]` (`TS7019` in the pin) —
 * which is exactly what `WrappedMethods<M>` already declares. This is the disposition
 * `createReducer` records for strict mode's implicit `any`, and it keeps the assertion count at the
 * pin's one: upstream's `{} as WrappedMethods<M>` becomes the same `as WrappedMethods<M>` on the
 * `reduce` result, with no new assertion added.
 *
 * `any` is kept verbatim throughout (`payload?: any`, `(payload?: any) => T`, `(...payload: any) =>
 * void`), matching the pin and AGENTS.md §1.1's "completely preserve upstream's API" rule for
 * react-use mirrors.
 *
 * Related: `createReducer` (this package) is the middleware-capable sibling — reach for it when the
 * transitions need middleware, and for `useMethods` when they do not.
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
export function useMethods<M, T>(createMethods: CreateMethods<M, T>, initialState: T): [T, WrappedMethods<M>] {
  const reducer = useMemo<Reducer<T, Action>>(
    () => (reducerState: T, action: Action) => {
      // The pin indexes the mapped type straight away; its `noImplicitAny:
      // false` inferred `any` for that lookup, so under `strict` the indexable
      // view is named here instead of asserted.
      const methods: Record<string, (payload?: any) => T> = createMethods(reducerState)
      return methods[action.type](...action.payload)
    },
    [createMethods],
  )

  // The pin's `useReducer<Reducer<T, Action>>(reducer, initialState)`: its
  // single type argument is gone in @types/react 19 (TS2558), and `reducer`'s
  // own annotation carries both types into inference unchanged.
  const [state, dispatch] = useReducer(reducer, initialState)

  const wrappedMethods: WrappedMethods<M> = useMemo(() => {
    // Derived from the INITIAL state, as upstream does — a method that exists
    // only on a later state is never wrapped.
    const actionTypes = Object.keys(createMethods(initialState))

    // The pin's `{} as WrappedMethods<M>` seed becomes the same assertion on the
    // reduce result, because the accumulator has to be indexable by `string`
    // first (upstream's `noImplicitAny: false` did that implicitly).
    return actionTypes.reduce<Record<string, (...payload: any[]) => void>>((acc, type) => {
      acc[type] = (...payload: any[]) => dispatch({ type, payload })
      return acc
    }, {}) as WrappedMethods<M>
  }, [createMethods, initialState])

  return [state, wrappedMethods]
}
