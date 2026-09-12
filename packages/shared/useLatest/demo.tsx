import { useLatest } from '@reause/shared'
import { useState } from 'react'

export default function UseLatestDemo() {
  const [value, setValue] = useState('a')
  const latest = useLatest(value)
  const [reads, setReads] = useState<string[]>([])

  function changeValue() {
    setValue(current => (current === 'a' ? 'b' : 'c'))
  }

  function scheduleRead() {
    // the timeout closes over the ref object, which never changes identity, so
    // it reads `latest.current` at the moment the timer actually fires — not
    // when the timer was scheduled
    setTimeout(() => {
      setReads(previous => [...previous, latest.current])
    }, 800)
  }

  return (
    <div>
      <p>
        value:
        {' '}
        <strong>{value}</strong>
      </p>
      <p>
        last async read:
        {' '}
        <strong>{reads[reads.length - 1] ?? '(none)'}</strong>
      </p>
      <button onClick={changeValue}>change value</button>
      <button onClick={scheduleRead}>read in 800ms</button>
    </div>
  )
}
