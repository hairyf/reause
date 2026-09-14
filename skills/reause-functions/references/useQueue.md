---
category: State
---

# useQueue

State hook that implements a simple FIFO queue — React port of react-use's `useQueue`.

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

`add` appends to the tail and `remove` drops the head; both go through
`useState`, so each one re-renders with an ordinary immutable array update.
`initialValue` is `useState`'s initial argument and is read only by the first
render — a changed value afterwards is ignored.

`first`, `last` and `size` are properties, not functions, and they are getters
over the state of the render that produced the returned object: each read tracks
the committed queue, and a value captured before a commit keeps answering from
the render it came from. The returned object itself is rebuilt on every render,
so its identity (and each method's) changes and it must not be used as an effect
or memo dependency.

`remove()` returns the removed item **synchronously** by capturing the head in a
closure inside the `setState` updater, which only produces a value when React
evaluates that updater eagerly. React does that on one path: when the hook's
fiber has no pending lanes, which in practice is a dispatch made while the
queue's fiber is idle. Everywhere else `remove()` returns `undefined` — a second
call in the same event handler, a call straight after `add` in the same handler,
a call after this component has committed its own state update, and an empty
queue. The removal itself always happens, because the queued updater runs during
the next render; only the return value is affected. Read `first` before calling
`remove()` when the value matters. The declared type is upstream's `() => T` and
is deliberately not widened to `T | undefined`.

Under `<StrictMode>` React double-invokes the updater to surface impurity; the
capture is idempotent (`result = first` on the same input twice), so the value
and the number of removed items are unaffected.

Ported from react-use's `source/react-use/src/useQueue.ts` (37 LOC) and
`source/react-use/docs/useQueue.md`. Upstream defines the hook as a `const` arrow
function and exports it **by default**; reause exports `useQueue` (and the
upstream-named `QueueMethods<T>` interface) **by name**, and uses a `function`
declaration per the repo's `antfu/top-level-function` rule. react-use's `useQueue`
has no VueUse counterpart: `@reause/shared`'s `useArray*` hooks are read-only
projections rather than mutable collections.

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
