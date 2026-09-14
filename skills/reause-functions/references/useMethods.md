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

`createMethods` receives the current state and returns one function per method name, each producing the **next** state. The hook's second tuple element wraps every one of those names in a `dispatch` call, so the wrapped methods return `void` — they dispatch, they do not compute. That asymmetry is upstream's public contract: `increment()` returns nothing, while the `increment` you wrote inside `createMethods` returns the next state.

The wrapper's whole argument list is **spread** into the method, so a call with several arguments arrives positionally rather than as one array. Because the upstream `CreateMethods` type declares each method as `(payload?: any) => T`, a method that wants those arguments positionally is written with a rest parameter (`(...args: number[]) => …`); a method declared with two required parameters is not assignable to that signature. The wrapped methods themselves are typed `(...payload: any) => void`, so passing several arguments at the call site is always allowed.

The set of wrapped methods is derived **once**, by calling `createMethods(initialState)` and taking `Object.keys` of the result. A method that appears only on a later state is therefore never wrapped — `methods.dec` stays `undefined` even after the state becomes one `createMethods` would give a `dec` for. That is upstream's behaviour, mirrored deliberately rather than "fixed" by reading the current state; the reducer, by contrast, does call `createMethods` with the current state on every dispatch.

Both arguments must be **referentially stable**. The reducer is memoised on `[createMethods]` and the wrapped set on `[createMethods, initialState]`, so an inline arrow or an inline object literal gets a new identity every render and re-creates the wrapped methods every render. Declare them at module scope, or hold them with `useCallback` / `useMemo`. `initialState`'s _value_ is read on the first render only, so changing it later never resets the state — but a new `initialState` **reference** still rebuilds the wrapped set.

Both types are `any`-carrying, exactly as upstream declares them (`payload?: any`, `(payload?: any) => T`, `(...payload: any) => void`); they are preserved rather than narrowed so the port stays signature-identical to the pin. For state transitions that need middleware, reach for the sibling `createReducer` instead.

Upstream mapping files: `source/react-use/src/useMethods.ts` and `source/react-use/docs/useMethods.md`.

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
