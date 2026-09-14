import { createGlobalState } from '@reause/shared'
import { useState } from 'react'

// The factory is called once, at module scope: every component below reads and
// writes the same value, and the store outlives all of them
const useGlobalValue = createGlobalState(0)

function CompA() {
  const [value, setValue] = useGlobalValue()

  return <button onClick={() => setValue(value + 1)}>+</button>
}

function CompB() {
  const [value, setValue] = useGlobalValue()

  return <button onClick={() => setValue(value - 1)}>-</button>
}

function CompC() {
  const [value] = useGlobalValue()

  return <span>{`CompC reads ${value}`}</span>
}

export default function CreateGlobalStateDemo() {
  const [value] = useGlobalValue()
  const [mounted, setMounted] = useState(true)

  return (
    <div>
      <p>
        value:
        {' '}
        <strong>{value}</strong>
      </p>
      <CompA />
      {' '}
      <CompB />
      {' '}
      <button onClick={() => setMounted(current => !current)}>
        {mounted ? 'unmount CompC' : 'mount CompC'}
      </button>
      <p>
        {mounted
          ? <CompC />
          : 'CompC is unmounted — the shared value above survives it, and reads the latest one when it mounts again'}
      </p>
    </div>
  )
}
