import { useUpdateEffect } from '@reause/shared'
import { useState } from 'react'

export default function UseUpdateEffectDemo() {
  const [count, setCount] = useState(0)
  const [updateRuns, setUpdateRuns] = useState(0)

  // skipped on mount; runs on every change of `count` afterwards
  useUpdateEffect(() => {
    setUpdateRuns(runs => runs + 1)
  }, [count])

  return (
    <div>
      <p>
        count:
        {' '}
        <strong>{count}</strong>
      </p>
      <p>
        update effect runs:
        {' '}
        <strong>{updateRuns}</strong>
        {' '}
        (mount excluded)
      </p>
      <button onClick={() => setCount(current => current + 1)}>increment</button>
    </div>
  )
}
