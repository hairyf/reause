import { useState } from 'react'
// Relative import (not `@reause/shared`): until this PR is merged the package
// name resolves through the worktree node_modules junction to the main repo's
// copy of @reause/shared, which does not contain createScopedHook yet.
import { createScopedHook } from '.'

const [CounterStoreProvider, useCounterStore] = createScopedHook(
  ({ initialValue }: { initialValue: number }) => {
    const [count, setCount] = useState(initialValue)
    return {
      count,
      inc: () => setCount(current => current + 1),
      dec: () => setCount(current => current - 1),
    }
  },
)

function Counter() {
  const { count, inc, dec } = useCounterStore()!

  return (
    <div>
      <span>
        {'Count is '}
        {count}
      </span>
      <button onClick={inc}>Increment</button>
      <button onClick={dec}>Decrement</button>
    </div>
  )
}

export default function createScopedHookDemo() {
  return (
    <CounterStoreProvider initialValue={0}>
      <Counter />
    </CounterStoreProvider>
  )
}
