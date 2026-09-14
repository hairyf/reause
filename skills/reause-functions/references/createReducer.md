---
category: Factory
---

# createReducer

Build a `useReducer`-shaped hook around a Redux-style middleware chain — React port of react-use's `createReducer`.

## Usage

```tsx
import { createReducer } from '@reause/shared'

type Action = { type: 'increment' } | { type: 'reset', payload: number }

// called once, at module scope: the returned function is a hook
const useReducer = createReducer<Action, { count: number }>(
  // store / next / action are contextually typed by the factory
  store => next => (action) => {
    const result = next(action)
    console.log('count', store.getState().count) // already the new state
    return result
  },
)

function Counter() {
  const [state, dispatch] = useReducer(
    (state, action) => action.type === 'increment'
      ? { count: state.count + 1 }
      : { count: action.payload },
    { count: 0 },
  )

  return <button onClick={() => dispatch({ type: 'increment' })}>{state.count}</button>
}
```

## Type Declarations

```ts
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
 * Map from react-use `createReducer` (source/react-use/src/factory/createReducer.ts).
 *
 * @see https://github.com/streamich/react-use/blob/master/src/factory/createReducer.ts
 * @see https://github.com/streamich/react-use/blob/master/docs/createReducer.md
 */
export declare function createReducer<Action, State>(
  ...middlewares: Middleware<Action, State>[]
): (
  reducer: (state: State, action: Action) => State,
  initialState: State,
  initializer?: (value: State) => State,
) => [State, Dispatch<Action>]
```
