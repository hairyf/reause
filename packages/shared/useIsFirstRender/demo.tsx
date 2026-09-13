import { useIsFirstRender } from '@reause/shared'
import { useState } from 'react'

export default function UseIsFirstRenderDemo() {
  const [count, setCount] = useState(0)
  const isFirstRender = useIsFirstRender()

  return (
    <div>
      <p>
        Is first render:
        {' '}
        <strong>{isFirstRender ? 'Yes' : 'No'}</strong>
      </p>
      <button onClick={() => setCount(current => current + 1)}>
        {`Rerendered ${count} times, click to rerender`}
      </button>
    </div>
  )
}
