import { useCallback, useRef, useState } from 'react'
import { useUpdateEffect } from '../useUpdateEffect'

/**
 * A Redux-style action dispatcher: what a middleware receives as `next`, what
 * `store.dispatch` exposes, and the second element of the tuple the hook
 * returns.
 *
 * Mirrors upstream's module-private alias exactly, `void` return type included.
 * The implementation behind it really does return the action it was given (see
 * `createReducer`), which a `void` signature is allowed to hide — upstream hides
 * it the same way, and the runtime promise is pinned by the test suite instead
 * of being smuggled into the type with an assertion (the pinned upstream file
 * contains no assertion at all).
 */
type Dispatch<Action> = (action: Action) => void

/**
 * The store a middleware is handed — upstream's module-private
 * `Store<Action, State>`. `getState` is accurate even *mid-dispatch* (see the
 * ref notes on `createReducer`), and `dispatch` re-enters the **whole** chain at
 * the outermost middleware rather than calling the reducer directly.
 */
interface Store<Action, State> {
  getState: () => State
  dispatch: Dispatch<Action>
}

/**
 * The Redux middleware shape upstream declares — `store => next => action =>
 * void` — and, like upstream, deliberately module-private.
 */
type Middleware<Action, State> = (
  store: Store<Action, State>,
) => (next: Dispatch<Action>) => (action: Action) => void

/**
 * Fold the middleware list into a single dispatcher.
 *
 * `reduceRight` is upstream's order, and it is what makes `middlewares[0]` the
 * **outermost** wrapper: with `createReducer(m1, m2)` a dispatch enters `m1`
 * first, `m2` receives `m1`'s `next`, and the reducer runs last. Every
 * middleware is handed the same `store` object, so `store.dispatch` called from
 * inside a middleware re-enters the chain at `m1`, never at the reducer.
 */
function composeMiddleware<Action, State>(chain: Middleware<Action, State>[]) {
  return (context: Store<Action, State>, dispatch: Dispatch<Action>): Dispatch<Action> => {
    return chain.reduceRight((next, middleware) => middleware(context)(next), dispatch)
  }
}

/**
 * Build a `useReducer`-shaped hook around a Redux-style middleware chain —
 * React port of react-use's `createReducer`.
 *
 * Map from react-use `createReducer`
 * (source/react-use/src/factory/createReducer.ts)
 * Mapping: mirrors upstream's 67-line factory behaviour 1:1. The factory closes
 * over `middlewares` and composes them once; the function it returns **is the
 * hook** — `(reducer, initialState, initializer?) => [state, dispatch]` — with
 * `initializer` in upstream's third parameter position and defaulting to the
 * identity function, and with the `[state, dispatch]` tuple shape unchanged.
 * Three deliberate surface differences only:
 * - upstream ships `export default createReducer`; reause exports it by name so
 *   `packages/shared/index.ts` can re-export it from the `@reause/shared` barrel
 *   (AGENTS.md §1.1's named-export convention for these mirrors);
 * - upstream declares the factory as a top-level `const` arrow, which this
 *   repo's enforced `antfu/top-level-function` rule rejects, so it is a
 *   `function` declaration like every other factory in the package;
 * - `Dispatch` / `Store` / `Middleware` stay module-private, exactly as
 *   upstream leaves them (the `useAsyncFn` port sets the same precedent), so the
 *   only new export is `createReducer`. To name the middleware type at a call
 *   site, derive it from a bound hook (`Parameters<typeof useMyReducer>[0]`) or
 *   write the middleware inline, where the factory's rest parameter types it
 *   contextually.
 *
 * **The ref + `useState` pair is upstream's design and is kept on purpose.**
 * The state lives in `ref.current`; `useState` exists only to schedule the
 * re-render. `dispatch` writes the ref **synchronously** and then mirrors that
 * value into React state, which is what buys the three guarantees this hook is
 * chosen for:
 * - two dispatches in one tick compose — the second one already reads the
 *   state the first produced, instead of both applying to one stale render;
 * - a middleware's `store.getState()` is accurate **mid-dispatch**: it sees the
 *   state the inner reducer just produced, before React has re-rendered;
 * - the tuple's `state` is read back from `ref.current`, so it is never a
 *   render behind the reducer.
 * Converting this to a plain `useState`/`useReducer` port would silently drop
 * the first two guarantees, so it is deliberately not "simplified".
 *
 * **React 19 rule.** Upstream annotates the composed dispatcher's ref as
 * `MutableRefObject<Dispatch<Action>>`; that type is gone in React 19, so the
 * container is written explicitly as `{ current: Dispatch<Action> }`
 * (docs/subagent-execution.md §3.2 forbids `as MutableRefObject<T>`). React
 * 19's `useRef` returns exactly that mutable shape, so the annotation needs no
 * assertion.
 *
 * **`dispatch` returns the action it was given.** Middleware relies on it — a
 * middleware that calls `store.dispatch` gets the value back through the chain,
 * as long as each middleware returns `next(action)` — while the public
 * `Dispatch<Action>` type says `void`, so TypeScript hides it. Worth recording
 * precisely, because the issue's premise that the port "needs the same cast
 * upstream uses" does not survive the pin: `source/react-use/src/factory/createReducer.ts`
 * contains **no `as` at all** (67 lines, zero assertions). The only type-level
 * convergence in upstream is the `MutableRefObject<Dispatch<Action>>`
 * annotation, and because `action` is annotated `Action` here (strict mode
 * forbids upstream's implicit `any`), `useCallback` infers `(action: Action) =>
 * Action`, which is structurally assignable to the `void`-returning
 * `Dispatch<Action>` — so no assertion is needed, and adding one would be a
 * gratuitous `as` that the `dispatchRef` annotation below already makes
 * redundant.
 *
 * **Re-composition is keyed on `dispatch`, not on the middleware array.**
 * `useUpdateEffect` re-composes the chain whenever its `dispatch` dependency
 * changes, and `dispatch` is `useCallback(..., [reducer])` — so the trigger is
 * the **reducer identity**, exactly as the pin and issue #931 describe ("the
 * middleware chain is re-composed when `dispatch` changes"). A fresh middleware
 * array, or a brand-new middleware function, with the *same* reducer reference
 * does **not** re-compose. Because the re-composition runs in an effect that
 * writes the ref, the render that observed the change still returns the previous
 * chain and the next render returns the re-composed one. The middleware list is
 * captured when the factory runs, so a caller that needs a varying list must
 * call `createReducer(...)` during render (binding its result to a `useXxx`
 * name) and change the reducer identity along with it.
 *
 * **`useUpdateEffect` is imported, not inlined.** The sibling port is merged in
 * `packages/shared/useUpdateEffect` and re-exported from the `@reause/shared`
 * barrel, so re-composition is done by the very hook upstream imports —
 * `../useUpdateEffect`, the relative form every shared hook uses so a source file
 * never imports its own package by name (eslint.config.js's self-import guard).
 *
 * Out of scope on purpose: upstream's `createReducerContext` and
 * `createStateContext` are separate factories and are not ported here.
 *
 * The returned function **is a hook** — it calls `useRef`, `useState`,
 * `useCallback` and `useUpdateEffect` — so bind the factory's result to a
 * `useXxx` name and call that inside a component or another hook:
 *
 * ```ts
 * type Action = { type: 'increment' } | { type: 'reset', payload: number }
 * interface State { count: number }
 *
 * const useCounterReducer = createReducer<Action, State>(
 *   // `store` / `next` / `action` are contextually typed by the factory
 *   store => next => (action) => {
 *     const result = next(action)
 *     console.log('count', store.getState().count) // already the new state
 *     return result
 *   },
 * )
 *
 * function Counter() {
 *   const [state, dispatch] = useCounterReducer(
 *     (state, action) => action.type === 'increment'
 *       ? { count: state.count + 1 }
 *       : { count: action.payload },
 *     { count: 0 },
 *   )
 *
 *   return (
 *     <button onClick={() => dispatch({ type: 'increment' })}>{state.count}</button>
 *   )
 * }
 * ```
 *
 * Upstream mapping files: `source/react-use/src/factory/createReducer.ts` (67
 * LOC) and `source/react-use/docs/createReducer.md`. There is **no upstream
 * test file** to mirror — the pinned tree ships no test suite at all
 * (`source/react-use/src` contains zero `*.test.*` files) — so the suite here
 * was written against the contract above rather than translated from upstream.
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
