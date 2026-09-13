import { useDeepCompareEffect } from '@reause/shared'
import { useState } from 'react'

export default function UseDeepCompareEffectDemo() {
  const [count, setCount] = useState(0)
  const [tick, setTick] = useState(0)
  const [runs, setRuns] = useState(0)
  const [log, setLog] = useState<string[]>([])

  // rebuilt on every render — a new object reference each time, with equal
  // contents until `count` changes
  const options = { id: count, label: `item-${count}` }

  useDeepCompareEffect(() => {
    setRuns(current => current + 1)
    setLog(entries => [...entries, `id=${options.id}`])
  }, [options])

  return (
    <div>
      <p>
        options:
        {' '}
        <strong>{JSON.stringify(options)}</strong>
      </p>
      <p>
        effect runs:
        {' '}
        <strong>{runs}</strong>
      </p>
      <p>
        effect log:
        {' '}
        {log.length > 0 ? log.join(', ') : 'none yet'}
      </p>
      <p>
        re-renders:
        {' '}
        <strong>{tick}</strong>
      </p>
      <button onClick={() => setTick(current => current + 1)}>re-render (rebuilds options)</button>
      <button onClick={() => setCount(current => current + 1)}>change id</button>
    </div>
  )
}
