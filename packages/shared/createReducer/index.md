---
category: Factory
---

# createReducer

Build a `useReducer`-shaped hook around a Redux-style middleware chain.

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
