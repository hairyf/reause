import { useTimeoutRafFn } from '@reause/shared'
import { useState } from 'react'

export default function UseTimeoutRafFnDemo() {
  const [text, setText] = useState('Waiting for the frame at or after 1 second')
  const [firedCount, setFiredCount] = useState(0)

  const clear = useTimeoutRafFn(() => {
    setFiredCount(count => count + 1)
    setText('Fired on a frame — and only once')
  }, 1000)

  return (
    <div>
      <p>{text}</p>
      <p>
        Fired:
        {' '}
        {firedCount}
      </p>
      <button type="button" onClick={() => clear()}>
        Clear
      </button>
    </div>
  )
}
