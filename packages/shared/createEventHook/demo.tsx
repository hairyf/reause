import { useEffect, useState } from 'react'
import { createEventHook } from '../createEventHook'

export default function CreateEventHookDemo() {
  const [count, setCount] = useState(0)
  // create the event hook once per component instance
  const [counter] = useState(() => createEventHook<number>())

  // register on mount and unregister through the returned off function on unmount
  useEffect(() => counter.on(value => setCount(value)), [counter])

  return (
    <div>
      <p>
        count:
        {' '}
        <strong>{count}</strong>
      </p>
      <button onClick={() => counter.trigger(count + 1)}>tick</button>
      <button onClick={() => counter.clear()}>clear listeners</button>
    </div>
  )
}
