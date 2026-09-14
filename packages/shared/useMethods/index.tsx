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
 * Map from react-use `useMethods`.
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
