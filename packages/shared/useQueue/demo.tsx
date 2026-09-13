import { useQueue } from '@reause/shared'
import { useState } from 'react'

/**
 * Mirrors react-use's own `docs/useQueue.md` demo — a queue, an "add" button
 * that appends `last + 1`, and a "remove" button — and adds the readout the
 * upstream demo hides: what `remove()` actually returned.
 *
 * That readout is the interesting part. `remove()` captures the head inside the
 * `setState` updater, so it only yields a value when React evaluates that
 * updater eagerly, which it does while the queue's fiber has no pending lanes.
 * The first click therefore reports the removed item, and a click that follows
 * one this component itself committed (a second click, or an "add" and then a
 * "remove" in the same handler) reports `undefined` even though the item is
 * still removed. The demo shows both outcomes rather than pretending the value
 * is always there.
 */
export default function UseQueueDemo() {
  const queue = useQueue([1, 2, 3])
  const [removed, setRemoved] = useState('—')

  return (
    <div>
      <ul>
        <li>
          first:
          {String(queue.first)}
        </li>
        <li>
          last:
          {String(queue.last)}
        </li>
        <li>
          size:
          {String(queue.size)}
        </li>
        <li>
          last remove() returned:
          {removed}
        </li>
      </ul>
      <button onClick={() => queue.add((queue.last ?? 0) + 1)}>add</button>
      <button
        onClick={() => {
          // Capture the head *before* removing: `queue.first` is read from the
          // state this render committed, so it is the item `remove()` is about
          // to drop, whether or not `remove()` itself manages to return it.
          // `remove()` is called before `setRemoved` on purpose — dispatching
          // first would take the eager path away from the removal.
          const head = queue.first
          const returned = queue.remove()
          setRemoved(returned === undefined ? `undefined (head was ${String(head)})` : String(returned))
        }}
      >
        remove
      </button>
    </div>
  )
}
