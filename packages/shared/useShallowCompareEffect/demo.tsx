import { useShallowCompareEffect } from '@reause/shared'
import { useState } from 'react'

export default function UseShallowCompareEffectDemo() {
  const [count, setCount] = useState(0)
  const [step, setStep] = useState(1)
  const [effectRuns, setEffectRuns] = useState(0)

  // rebuilt on every render, but shallow-equal to the previous one while `step` is unchanged
  const options = { step }

  useShallowCompareEffect(() => {
    setEffectRuns(runs => runs + 1)
  }, [options])

  return (
    <div>
      <p>
        options.step:
        {' '}
        <strong>{step}</strong>
      </p>
      <p>
        re-renders:
        {' '}
        <strong>{count}</strong>
        {' '}
        — effect runs:
        {' '}
        <strong>{effectRuns}</strong>
        {' '}
        (stays flat until `step` changes)
      </p>
      <button onClick={() => setCount(current => current + 1)}>re-render</button>
      <button onClick={() => setStep(current => current + 1)}>change step</button>
    </div>
  )
}
