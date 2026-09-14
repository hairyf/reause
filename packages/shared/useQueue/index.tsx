import { useState } from 'react'

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
export function useQueue<T>(initialValue: T[] = []): QueueMethods<T> {
  const [state, setState] = useState(initialValue)

  return {
    add: (item) => {
      setState(queue => [...queue, item])
    },
    remove: () => {
      // Type-only deviation, one assertion. Upstream writes `let result;` — an
      // implicitly-`any` evolving local — which is fine under react-use's
      // non-strict tsconfig. Under this repo's `strict` the only assignment
      // lives inside the updater closure, and control-flow analysis does not
      // follow it, so the local narrows to `undefined` at the `return` below.
      // Spelling the honest type (`T | undefined`: undefined is exactly what the
      // non-eager paths of the note above produce) and asserting once restores
      // the pin's declared `() => T` without changing a byte of behaviour. The
      // assertion is upstream's own claim, not a new one.
      let result: T | undefined
      setState(([first, ...rest]) => {
        result = first
        return rest
      })
      return result as T
    },
    get first() {
      return state[0]
    },
    get last() {
      return state[state.length - 1]
    },
    get size() {
      return state.length
    },
  }
}
