/* eslint-disable no-console -- this hook's only output IS `console.log`, so the
 * demo has to read and patch it to show anything at all. */
import { useLogger } from '@reause/shared'
import { useEffect, useRef, useState } from 'react'

/**
 * `useLogger` writes to `console.log`, so this demo mirrors those calls into the
 * page — otherwise the hook would be invisible in the docs. The interception is
 * installed *after* `useLogger` has been called (so it is already capturing by
 * the time the mount line fires) and torn down on unmount (so the unmount line
 * is captured too). React restores the original as a dev double-invocation
 * refreshes it, so the demo works under `<StrictMode>` as well.
 */
function captureConsoleToLog(onLine: (line: string) => void) {
  const original = console.log

  console.log = (...args: unknown[]) => {
    onLine(args.map(String).join(' '))
    original.apply(console, args)
  }

  return () => {
    console.log = original
  }
}

const TODOS: string[][] = [[], ['write the port'], ['write the port', 'run the suite']]

export default function UseLoggerDemo() {
  const [todos, setTodos] = useState<string[]>(TODOS[0]!)
  const [count, setCount] = useState(0)
  const [logs, setLogs] = useState<string[]>([])

  /** `TODOS[count]` is read through a ref so the click handler stays stable. */
  const bump = useRef((next: number) => {
    setTodos(TODOS[next % TODOS.length]!)
    setCount(next)
  })

  // The component name is the first argument and never changes; the todo list is
  // the extra argument, forwarded to the `mounted` and `updated` lines.
  useLogger('TodoListDemo', ...todos)

  useEffect(() => captureConsoleToLog(line => setLogs(current => [...current, line])), [])

  return (
    <div>
      <p>
        logged so far:
        {' '}
        <strong>{logs.length}</strong>
      </p>
      <ul>
        {logs.length > 0
          ? logs.map((line, index) => <li key={index}>{line}</li>)
          : <li>nothing yet</li>}
      </ul>
      <p>
        todos:
        {' '}
        {todos.length > 0 ? todos.join(', ') : 'none'}
      </p>
      <button onClick={() => bump.current(count + 1)}>change todos</button>
    </div>
  )
}
