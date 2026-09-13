import { createReducer } from '@reause/shared'
import { useState } from 'react'

type Action
  = | { type: 'inc' }
    | { type: 'add', payload: number }
    | { type: 'doubleInc' }

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'inc':
      return state + 1
    case 'add':
      return state + action.payload
    default:
      // `doubleInc` never reaches the reducer — the middleware expands it into
      // two `inc` dispatches.
      return state
  }
}

// Demo-only log, newest first: a module-level array the middlewares write to.
const log: string[] = []

// The factory is called once, at module scope, and its result is bound to a
// `useXxx` name because the returned function is a hook.
const useCounterReducer = createReducer<Action, number>(
  // 1st middleware: the *outermost* one (upstream composes with `reduceRight`),
  // so it sees every dispatch first and its `next` is the middleware below.
  // `store` / `next` / `action` are contextually typed by the factory, which is
  // why upstream's `Middleware<Action, State>` type stays module-private.
  store => next => (action) => {
    const before = store.getState()
    const result = next(action)
    // mid-dispatch freshness: after `next`, the reducer has already written the
    // new state, so `getState()` is not one render behind
    log.unshift(`${action.type}: count ${before} → ${store.getState()}`)
    return result
  },
  // 2nd middleware: expands `doubleInc` by dispatching through the whole chain.
  // `store.dispatch` re-enters the 1st middleware, not the reducer directly.
  store => next => (action) => {
    if (action.type === 'doubleInc') {
      store.dispatch({ type: 'inc' })
      store.dispatch({ type: 'inc' })
      return undefined
    }
    return next(action)
  },
)

export default function CreateReducerDemo() {
  const [count, dispatch] = useCounterReducer(reducer, 0)
  const [, setLogVersion] = useState(0)

  return (
    <div>
      <p>
        count:
        {' '}
        <strong>{count}</strong>
      </p>
      <button onClick={() => dispatch({ type: 'inc' })}>dispatch inc</button>
      {' '}
      <button onClick={() => dispatch({ type: 'add', payload: 5 })}>dispatch add 5</button>
      {' '}
      <button onClick={() => dispatch({ type: 'doubleInc' })}>
        dispatch doubleInc (middleware calls store.dispatch)
      </button>
      {' '}
      <button
        onClick={() => {
          log.length = 0
          setLogVersion(version => version + 1)
        }}
      >
        clear log
      </button>
      <ul>
        {log.slice(0, 8).map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ul>
    </div>
  )
}
