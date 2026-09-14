---
category: State
---

# useQueue

State hook that implements a simple FIFO queue.

## Usage

```tsx
import { useQueue } from '@reause/shared'

const queue = useQueue([1, 2, 3])

queue.first // 1
queue.last // 3
queue.size // 3
queue.add(4) // the queue becomes [1, 2, 3, 4]
queue.remove() // 1 — while the queue's fiber is idle, see below
queue.size // 3
```

## Type Declarations

```ts
/**
 * The value `useQueue` returns — react-use's exported `QueueMethods<T>` interface, mirrored member
 * for member and with upstream's declared parameter lists.
 *
 * `first` and `last` are **not** snapshot values and not functions: upstream declares them as plain
 * properties of the returned object and implements them as getters, so every read is evaluated
 * lazily against the state of the render that produced the object. `remove` is declared as `() =>
 * T` although an empty queue makes it return `undefined`; that type/behaviour gap is upstream's and
 * is kept rather than narrowed.
 */
export interface QueueMethods<T> {
  /** Appends `item` to the tail of the queue. */
  add: (item: T) => void
  /**
   * Removes and returns the head of the queue. The return value is produced by a closure assignment
   * inside the `setState` updater — see the note on `useQueue` below for exactly when that is
   * observable.
   */
  remove: () => T
  /** Head of the queue, evaluated lazily against the current state. */
  first: T
  /** Tail of the queue, evaluated lazily against the current state. */
  last: T
  /** Number of items currently queued. */
  size: number
}
/**
 * Map from react-use `useQueue`.
 *
 * @param initialValue Initial queue contents. Read only by the first render, as
 * `useState`'s initial argument; a changed value is ignored afterwards.
 *
 * @example
 * const queue = useQueue([1, 2, 3])
 *
 * queue.first // 1
 * queue.last // 3
 * queue.size // 3
 * queue.add(4) // re-renders with [1, 2, 3, 4]
 * queue.remove() // 1 — same event handler, idle queue
 * queue.size // 3
 */
export declare function useQueue<T>(initialValue?: T[]): QueueMethods<T>
```
