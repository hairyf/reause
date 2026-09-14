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
