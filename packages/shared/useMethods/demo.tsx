import { useMethods } from '@reause/shared'

interface Counter {
  count: number
}

/**
 * Module scope on purpose: the hook memoises its reducer on `[createMethods]`
 * and its wrapped methods on `[createMethods, initialState]`, so both have to
 * keep their identity across renders. An inline arrow or object literal would
 * re-create the wrapped set on every render.
 */
const initialState: Counter = { count: 0 }

function createMethods(state: Counter) {
  return {
    reset: () => initialState,
    increment: () => ({ count: state.count + 1 }),
    decrement: () => ({ count: state.count - 1 }),
  }
}

/**
 * The handler is wired straight to the method, as the upstream docs page does.
 * That passes the click event through as the wrapper's payload — the spread
 * path — and `createMethods` ignores the argument.
 */
export default function UseMethodsDemo() {
  const [state, { increment, decrement, reset }] = useMethods(createMethods, initialState)

  return (
    <div>
      <p>
        count:
        {' '}
        <strong>{state.count}</strong>
      </p>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>reset</button>
      <button onClick={increment}>+</button>
    </div>
  )
}
