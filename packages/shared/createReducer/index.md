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

The returned hook takes `(reducer, initialState, initializer?)` and returns the `[state, dispatch]` tuple, with `initializer` applied to `initialState` and defaulting to the identity function — upstream's parameter order exactly. A middleware has Redux's shape, `store => next => action => void`, and the list composes with `reduceRight`, so the **first** middleware is the outermost one: a `createReducer(m1, m2)` dispatch enters `m1`, then `m2`, then the reducer. Each middleware gets the same `store`, whose `getState()` is accurate **mid-dispatch** — it already sees the state the reducer just produced, before React re-renders — and whose `dispatch()` re-enters the whole chain from `m1` rather than calling the reducer directly. That freshness is the point of the hook: the state lives in a ref that `dispatch` writes synchronously and mirrors into `useState`, so several dispatches in one tick compose instead of all reducing from one stale render.

`dispatch` returns the action it was given, which middleware can rely on, but the public `Dispatch<Action>` type says `void`, so TypeScript hides that value; the pinned implementation contains no type assertion at all, and neither does this port. The chain is re-composed by `useUpdateEffect` whenever `dispatch` changes — which, since `dispatch` is keyed on the reducer, means the **reducer identity**, not the middleware array. The middleware list itself is captured when the factory is called, so call `createReducer(...)` during render when the list has to vary. `Dispatch`, `Store` and `Middleware` stay module-private, as upstream leaves them; derive the middleware type from a bound hook if you need to name it.

Ported from react-use's `source/react-use/src/factory/createReducer.ts`, `source/react-use/src/useUpdateEffect.ts` (the hook that re-composes the chain, imported from `@reause/shared` rather than inlined) and `source/react-use/docs/createReducer.md`. Upstream exports it as the default; reause exports it by name, the convention for these mirrors. There is no upstream test file to mirror — the pinned `source/react-use/src` tree ships no `*.test.*` files at all. `createReducerContext` / `createStateContext` are separate upstream factories and are deliberately not part of this port. The upstream links `https://github.com/streamich/react-use/blob/master/src/factory/createReducer.ts` and `https://github.com/streamich/react-use/blob/master/docs/createReducer.md` were not fetched while writing this page and are unverified.
