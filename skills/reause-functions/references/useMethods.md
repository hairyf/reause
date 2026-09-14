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

## Type Declarations

```ts
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
export declare function useMethods<M, T>(
  createMethods: CreateMethods<M, T>,
  initialState: T,
): [T, WrappedMethods<M>]
```
