import { useUnmountedRef } from '@reause/shared'
import { useCallback, useEffect, useState } from 'react'

function Pending({ log }: { log: (line: string) => void }) {
  const unmountedRef = useUnmountedRef()

  useEffect(() => {
    const timer = setTimeout(() => {
      log(
        unmountedRef.current
          ? 'late result discarded — the component had unmounted'
          : 'late result applied — the component was still mounted',
      )
    }, 1200)

    return () => clearTimeout(timer)
  }, [log])

  return <span>pending request…</span>
}

export default function UseUnmountedRefDemo() {
  const [visible, setVisible] = useState(true)
  const [lines, setLines] = useState<string[]>([])

  const log = useCallback((line: string) => {
    setLines(previous => [...previous, line])
  }, [])

  return (
    <div>
      <p>{visible ? <Pending log={log} /> : <span>nothing pending</span>}</p>
      <p>
        <button onClick={() => setVisible(value => !value)}>
          {visible ? 'unmount' : 'mount'}
        </button>
        {' '}
        <button onClick={() => setLines([])}>clear log</button>
      </p>
      <ul>
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
      <p>
        Unmount while the request is pending: the callback still runs, reads
        {' '}
        <code>unmountedRef.current === true</code>
        {' '}
        and skips its state update.
      </p>
    </div>
  )
}
