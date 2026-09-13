import { useClickAway } from '@reause/core'
import { useRef, useState } from 'react'

export default function UseClickAwayDemo() {
  const [counter, setCounter] = useState(0)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // target/ref first — the reause order (upstream ahooks is `(handler, target, eventName)`)
  useClickAway(panelRef, () => {
    setCounter(count => count + 1)
    setOpen(false)
  })

  return (
    <div className="us-click-away">
      <button type="button" onClick={() => setOpen(value => !value)}>
        Toggle panel
      </button>
      {open && (
        <div ref={panelRef} className="mt-2 inline-block border rounded p-2">
          Clicking inside this panel keeps the counter still — click anywhere
          else to close it.
        </div>
      )}
      <p className="mt-2">
        Outside clicks:
        {' '}
        {counter}
      </p>
    </div>
  )
}
