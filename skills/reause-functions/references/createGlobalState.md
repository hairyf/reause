---
category: State
---

# createGlobalState

Keep state in the global scope, reusable across React components.

## Usage

```tsx
import { createGlobalState } from '@reause/shared'

// called once, at module scope: every component below reads the same state
const useGlobalValue = createGlobalState(0)

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

## Type Declarations

```ts
/**
 * Map from react-use `createGlobalState` (source/react-use/src/factory/createGlobalState.ts).
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
