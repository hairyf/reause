import { useCounter, usePreviousDistinct } from '@reause/shared'
import { useState } from 'react'

export default function UsePreviousDistinctDemo() {
  // Mirrors upstream's demo: a `count` the hook watches, and an unrelated
  // counter whose increments re-render the component without touching it.
  const { count, inc: incRelated } = useCounter(0)
  const { count: unrelatedCount, inc: incUnrelated } = useCounter(0)
  const previous = usePreviousDistinct(count)

  const [text, setText] = useState('something_lowercase')
  // upstream's second example: a comparator that treats the two values as the
  // same when their upper-cased forms match
  const previousText = usePreviousDistinct(
    text,
    (prev, next) => (prev ?? '').toUpperCase() === next.toUpperCase(),
  )

  return (
    <div>
      <p>
        <span>{`count: ${count}, previous distinct: ${String(previous)}`}</span>
        {' '}
        <button onClick={() => incRelated()}>increment count</button>
        {' '}
        <button onClick={() => incUnrelated()}>increment unrelated</button>
      </p>
      <p>
        {`unrelated: ${unrelatedCount} — re-rendering through it leaves the reported value alone.`}
      </p>
      <p>
        <input value={text} onChange={event => setText(event.target.value)} />
        {' '}
        <span>{`previous distinct: ${String(previousText)}`}</span>
      </p>
      <p>
        The second hook compares case-insensitively, so retyping the same word in
        a different case leaves its reported value where it was.
      </p>
    </div>
  )
}
