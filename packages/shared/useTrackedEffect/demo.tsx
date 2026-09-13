import { useTrackedEffect } from '@reause/shared'
import { useState } from 'react'

export default function UseTrackedEffectDemo() {
  const [count, setCount] = useState(0)
  const [text, setText] = useState('a')
  const [log, setLog] = useState<string[]>([])

  // `changes` holds the indexes of the deps that moved: 0 → count, 1 → text.
  // On mount it is every index, so the first entry shows both.
  useTrackedEffect((changes) => {
    const moved = changes
      ?.map(index => (index === 0 ? 'count' : 'text'))
      .join(', ')

    setLog(entries => [...entries, `changed: ${moved || '(nothing)'}`])
  }, [count, text])

  return (
    <div>
      <p>
        count:
        {' '}
        <strong>{count}</strong>
      </p>
      <p>
        text:
        {' '}
        <strong>{text}</strong>
      </p>
      <div>
        <button onClick={() => setCount(current => current + 1)}>count + 1</button>
        <button onClick={() => setText(current => (current === 'a' ? 'b' : 'a'))}>toggle text</button>
      </div>
      <ol>
        {log.map((entry, index) => (
          <li key={index}>{entry}</li>
        ))}
      </ol>
    </div>
  )
}
