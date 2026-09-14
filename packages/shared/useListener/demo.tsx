import { createEventHook, useListener } from '@reause/shared'
import { useState } from 'react'

export default function Demo() {
  const [event] = useState(() => createEventHook<string>())
  const [events, setEvents] = useState<string[]>([])

  // the event hook object is passed straight in — `useListener` reads its `on`
  useListener(event, (value) => {
    setEvents(prev => [...prev, value])
  })

  return (
    <div>
      <p>
        Listeners registered and cleaned up automatically by
        <code>useListener</code>
        .
      </p>
      <button type="button" onClick={() => event.trigger('ping')}>
        Trigger event
      </button>
      <ul>
        {events.map((event, index) => (
          <li key={index}>{event}</li>
        ))}
      </ul>
    </div>
  )
}
