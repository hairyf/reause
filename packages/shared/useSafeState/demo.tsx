import { useSafeState } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A request that resolves after a delay and then calls the hook's setter, which
 * is exactly the "late update" `useSafeState` exists for. Unmount the child
 * while the request is still pending: the callback still runs, but its `setValue`
 * is skipped, so nothing is applied and no unmounted-update warning appears.
 */
const REQUEST_MS = 1500

function Pending({ log }: { log: (line: string) => void }) {
  const [value, setValue] = useSafeState('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearTimeout(timer.current)
  }, [])

  const load = useCallback(() => {
    setValue('loading…')
    log('request started — the value is now "loading…"')

    timer.current = window.setTimeout(() => {
      setValue('done')
      log('request resolved after 1.5s — setValue("done") was called')
    }, REQUEST_MS)
  }, [log, setValue])

  return (
    <p>
      <button onClick={load}>start a 1.5s request</button>
      {' '}
      current value:
      {' '}
      <strong>{value}</strong>
    </p>
  )
}

export default function UseSafeStateDemo() {
  const [mounted, setMounted] = useState(true)
  const [lines, setLines] = useState<string[]>([])

  const log = useCallback((line: string) => {
    setLines(previous => [...previous, line])
  }, [])

  return (
    <div>
      {mounted
        ? <Pending log={log} />
        : <p>the component is unmounted — start a request, then unmount it to see the setter go quiet</p>}

      <p>
        <button onClick={() => setMounted(value => !value)}>
          {mounted ? 'unmount' : 'remount'}
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
        Start a request and unmount before it resolves: the resolution line is
        still logged, but the value stays frozen at
        {' '}
        <code>loading…</code>
        {' '}
        because
        the setter became a no-op.
      </p>
    </div>
  )
}
