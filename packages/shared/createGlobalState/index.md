---
category: State
---

# createGlobalState

Keep state in the global scope, reusable across React components — React port of react-use's `createGlobalState`.

## Usage

```tsx
import { createGlobalState } from '@reause/shared'

// called once, at module scope: every component below reads the same state
const useGlobalValue = createGlobalState<number>(0)

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

The initial state can also be a function, and `setState` accepts an updater:

```tsx
const useGlobalValue = createGlobalState<number>(() => 0)

function CompA() {
  const [value, setValue] = useGlobalValue()

  return <button onClick={() => setValue(value => value + 1)}>+</button>
}
```

The argument is the **initial state**, resolved once when `createGlobalState` is called — at module scope, never during a render — so the hook the factory returns takes no arguments. Every consumer of that hook shares one value and one setter, and the store is module-wide and never disposed: unmounting and remounting a component reads back the value written before. `setState` takes a value, an updater `prev => next`, or a zero-argument `() => next`; following react-use's `resolveHookState`, a function action is called with the current state only when it declares a parameter.

Ported from react-use's `source/react-use/src/factory/createGlobalState.ts` and `source/react-use/docs/createGlobalState.md`. VueUse ships a `createGlobalState` too, but with a different API — a variadic factory that hands its shared refs back — and it is not this page's upstream: here the parameter is react-use's initial state.
