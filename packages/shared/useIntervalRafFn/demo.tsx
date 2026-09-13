import { useIntervalRafFn } from '@reause/shared'
import { useState } from 'react'

export default function UseIntervalRafFnDemo() {
  const [count, setCount] = useState(0)
  const [running, setRunning] = useState(true)

  const clear = useIntervalRafFn(() => {
    setCount(value => value + 1)
  }, 1000)

  return (
    <div>
      <p>
        Fired:
        {' '}
        {count}
        {' '}
        times — once per frame at or after 1 second
      </p>
      <p>{running ? 'The loop is running' : 'The loop was cleared'}</p>
      <button
        type="button"
        onClick={() => {
          clear()
          setRunning(false)
        }}
      >
        Clear
      </button>
    </div>
  )
}
