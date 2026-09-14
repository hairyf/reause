import { useEventListener } from '@reause/core'
import { useRef, useState } from 'react'

export default function UseEventListenerDemo() {
  const target = useRef<HTMLDivElement>(null)
  const [clicks, setClicks] = useState(0)
  const [keyCount, setKeyCount] = useState(0)

  // ref-like element target — React attaches `target.current` after the first
  // render, so the hook resolves it from its post-commit effect
  useEventListener(target, 'click', () => {
    setClicks(count => count + 1)
  })

  // omitted target defaults to window
  useEventListener('keydown', () => {
    setKeyCount(count => count + 1)
  })

  return (
    <div>
      <div ref={target} className="us-event-listener-target">
        <p>Click me</p>
      </div>
      <p>
        Button clicks:
        {' '}
        {clicks}
      </p>
      <p>
        Keydown events (window):
        {' '}
        {keyCount}
      </p>
    </div>
  )
}
