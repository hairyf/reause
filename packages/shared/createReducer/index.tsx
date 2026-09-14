import { useCallback, useRef, useState } from 'react'
import { useUpdateEffect } from '../useUpdateEffect'

/**
 * A Redux-style action dispatcher: what a middleware receives as `next`, what `store.dispatch`
 * exposes, and the second element of the tuple the hook returns.
 *
 * `void` return type included. The implementation behind it really does return the action it was
 * given (see `createReducer`), which a `void` signature is allowed to hide — upstream hides it the
 * same way, and the runtime promise is pinned by the test suite instead of being smuggled into the
 * type with an assertion (the pinned upstream file contains no assertion at all).
 */
type Dispatch<Action> = (action: Action) => void

/**
 * The store a middleware is handed — upstream's module-private `Store<Action, State>`. `getState`
 * is accurate even *mid-dispatch* (see the ref notes on `createReducer`), and `dispatch` re-enters
 * the **whole** chain at the outermost middleware rather than calling the reducer directly.
 */
interface Store<Action, State> {
  getState: () => State
  dispatch: Dispatch<Action>
}

/**
 * The Redux middleware shape upstream declares — `store => next => action => void` — and, like
 * upstream, deliberately module-private.
 */
type Middleware<Action, State> = (
  store: Store<Action, State>,
) => (next: Dispatch<Action>) => (action: Action) => void

/**
 * Fold the middleware list into a single dispatcher.
 *
 * `reduceRight` is upstream's order, and it is what makes `middlewares[0]` the **outermost**
 * wrapper: with `createReducer(m1, m2)` a dispatch enters `m1` first, `m2` receives `m1`'s `next`,
 * and the reducer runs last. Every middleware is handed the same `store` object, so
 * `store.dispatch` called from inside a middleware re-enters the chain at `m1`, never at the
 * reducer.
 */
function composeMiddleware<Action, State>(chain: Middleware<Action, State>[]) {
  return (context: Store<Action, State>, dispatch: Dispatch<Action>): Dispatch<Action> => {
    return chain.reduceRight((next, middleware) => middleware(context)(next), dispatch)
  }
}

/**
 * Map from react-use `createReducer` (source/react-use/src/factory/createReducer.ts).
 *
 * @see https://github.com/streamich/react-use/blob/master/src/factory/createReducer.ts
 * @see https://github.com/streamich/react-use/blob/master/docs/createReducer.md
 */
/* @__NO_SIDE_EFFECTS__ */
export function createReducer<Action, State>(...middlewares: Middleware<Action, State>[]) {
  const composedMiddleware = composeMiddleware<Action, State>(middlewares)

  return (
    reducer: (state: State, action: Action) => State,
    initialState: State,
    initializer = (value: State) => value,
  ): [State, Dispatch<Action>] => {
    // Upstream's pair: the ref holds the real state, `useState` only schedules
    // the re-render. `initializer` runs in upstream's position — applied to
    // `initialState`, with the identity function as its default.
    const ref = useRef(initializer(initialState))
    const [, setState] = useState(ref.current)

    const dispatch = useCallback(
      (action: Action) => {
        // The synchronous ref write is the point of this design: the next
        // `dispatch` and any `store.getState()` see it immediately, before
        // React re-renders.
        ref.current = reducer(ref.current, action)
        setState(ref.current)
        // The runtime value middleware relies on; `Dispatch<Action>` hides it
        // as `void` (upstream does the same, and needs no assertion either).
        return action
      },
      [reducer],
    )

    // The React 19 replacement for upstream's
    // `MutableRefObject<Dispatch<Action>>` annotation, and the single place the
    // action-returning implementation is widened to the public `void` type —
    // which is why that needs no `as`.
    const dispatchRef: { current: Dispatch<Action> } = useRef(
      composedMiddleware(
        {
          getState: () => ref.current,
          dispatch: (...args: [Action]) => dispatchRef.current(...args),
        },
        dispatch,
      ),
    )

    // Re-composed when `dispatch` changes, i.e. when the reducer identity
    // changes — the pin's dependency, not the middleware array.
    useUpdateEffect(() => {
      dispatchRef.current = composedMiddleware(
        {
          getState: () => ref.current,
          dispatch: (...args: [Action]) => dispatchRef.current(...args),
        },
        dispatch,
      )
    }, [dispatch])

    return [ref.current, dispatchRef.current]
  }
}
