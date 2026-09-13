import { useLockFn } from '@reause/shared'
import { useRef, useState } from 'react'

/**
 * Mirrors ahooks' `source/ahooks/packages/hooks/src/useLockFn/demo/demo1.tsx` — a
 * single button that starts a slow async action, where further clicks before it
 * finishes are ignored — and makes the ignored clicks *visible*, which upstream's
 * demo does not: each click is logged with what its call resolved to.
 *
 * The distinction the log shows is the point of the hook. A click that is
 * dropped resolves to `undefined`; a click that ran resolves to the value the
 * action returned. `submit` returns its own label so the two outcomes can be
 * told apart at runtime — with a `void` action both would be `undefined`.
 *
 * Click twice in a row to see it: the first entry goes to `completed` after the
 * delay, the second is `dropped` immediately.
 */
export default function UseLockFnDemo() {
  const [done, setDone] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const clicksRef = useRef(0)

  const submit = useLockFn(async (label: string) => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1500)
    })
    setDone(value => value + 1)

    return label
  })

  function append(entry: string) {
    setLog(entries => [entry, ...entries].slice(0, 6))
  }

  function handleClick() {
    clicksRef.current += 1
    const label = `#${clicksRef.current}`
    append(`click ${label} → started`)

    void submit(label).then((result) => {
      const outcome = result === undefined
        ? 'dropped (returned undefined)'
        : `completed (returned "${result}")`

      append(`click ${label} → ${outcome}`)
    })
  }

  return (
    <div>
      <p>
        Completed submits:
        {done}
      </p>
      <button onClick={handleClick}>Submit</button>
      <ul>
        {log.map(entry => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </div>
  )
}
