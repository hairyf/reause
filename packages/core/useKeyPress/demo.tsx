import { useKeyPress } from '@reause/core'
import { useRef, useState } from 'react'

export default function UseKeyPressDemo() {
  const [matched, setMatched] = useState('—')
  const [captured, setCaptured] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  // an array reports the *filter* that matched as `key`, so one listener can
  // tell `c` from `Shift+C` from `Ctrl+Shift+C`
  useKeyPress(
    ['c', 'shift.c', 'shift.ctrl.c'],
    (_event, key) => setMatched(String(key)),
    { exactMatch: true },
  )

  // `target` + `useCapture`: the listener lives on this panel only
  useKeyPress('escape', () => setCaptured(count => count + 1), {
    target: panelRef,
    useCapture: true,
  })

  return (
    <div className="us-key-press">
      <p>
        Press
        {' '}
        <kbd>c</kbd>
        {', '}
        <kbd>Shift</kbd>
        +
        <kbd>c</kbd>
        {' or '}
        <kbd>Ctrl</kbd>
        +
        <kbd>Shift</kbd>
        +
        <kbd>c</kbd>
        {' — matched filter: '}
        <strong>{matched}</strong>
      </p>
      <div ref={panelRef} tabIndex={0} className="mt-2 inline-block border rounded p-2">
        Focus this panel and press
        {' '}
        <kbd>Escape</kbd>
        {' (capture phase) — count: '}
        {captured}
      </div>
    </div>
  )
}
