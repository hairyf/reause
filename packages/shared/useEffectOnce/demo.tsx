import { useEffectOnce } from '@reause/shared'
import { useState } from 'react'

/**
 * A minimal subscription source: `subscribe` starts emitting and returns the
 * unsubscribe function that `useEffectOnce` forwards to React as the mount
 * effect's cleanup.
 */
function subscribeToCounter(onValue: (value: number) => void) {
  let value = 0
  const timer = setInterval(() => {
    value += 1
    onValue(value)
  }, 1000)
  return () => clearInterval(timer)
}

function Counter({ onTeardown }: { onTeardown: () => void }) {
  const [value, setValue] = useState(0)

  useEffectOnce(() => {
    const unsubscribe = subscribeToCounter(setValue)

    // `useMount` would drop this cleanup; `useEffectOnce` forwards it, so the
    // subscription is torn down when the child unmounts
    return () => {
      unsubscribe()
      onTeardown()
    }
  })

  return (
    <p>
      source value:
      {' '}
      <strong>{value}</strong>
    </p>
  )
}

export default function UseEffectOnceDemo() {
  const [subscribed, setSubscribed] = useState(true)
  const [teardowns, setTeardowns] = useState(0)

  return (
    <div>
      {subscribed
        ? <Counter onTeardown={() => setTeardowns(count => count + 1)} />
        : <p>subscription torn down</p>}
      <p>
        cleanups:
        {' '}
        <strong>{teardowns}</strong>
      </p>
      <button onClick={() => setSubscribed(value => !value)}>
        {subscribed ? 'unsubscribe' : 'resubscribe'}
      </button>
    </div>
  )
}
