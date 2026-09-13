import { useState } from 'react'

/**
 * The value `useQueue` returns — react-use's exported `QueueMethods<T>`
 * interface, mirrored member for member and with upstream's declared parameter
 * lists.
 *
 * `first` and `last` are **not** snapshot values and not functions: upstream
 * declares them as plain properties of the returned object and implements them
 * as getters, so every read is evaluated lazily against the state of the render
 * that produced the object. `remove` is declared as `() => T` although an empty
 * queue makes it return `undefined`; that type/behaviour gap is upstream's and
 * is kept rather than narrowed.
 */
export interface QueueMethods<T> {
  /** Appends `item` to the tail of the queue. */
  add: (item: T) => void
  /**
   * Removes and returns the head of the queue. The return value is produced by
   * a closure assignment inside the `setState` updater — see the note on
   * `useQueue` below for exactly when that is observable.
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
 * React port of react-use's `useQueue`.
 *
 * Map from react-use `useQueue`
 * Mapping: mirrored 1:1 — the `initialValue` argument, the `QueueMethods<T>`
 * return object and all five members (`add`, `remove`, the `first` / `last` /
 * `size` getters) keep upstream's names, types and semantics, and the hook is
 * built on `useState` alone, exactly as upstream is. The queue is an ordinary
 * `T[]` in state, so `add` is `setState(queue => [...queue, item])` and nothing
 * is shared between renders.
 *
 * Declaration deviation (documented, the only one on the API): upstream defines
 * the hook as a `const` arrow function and ships it as the module's **default**
 * export (`const useQueue = <T>(…) => …; export default useQueue`). reause
 * requires a top-level `function` declaration (`antfu/top-level-function`) and a
 * **named** export, so this file exports `function useQueue`. The other upstream
 * export, the `QueueMethods<T>` interface, is already named upstream and is
 * mirrored by name. The implementation body is upstream's, statement for
 * statement, with a single type-only addition: `remove`'s local is spelled
 * `T | undefined` and asserted once at the `return`, because the pin's implicit
 * `let result;` does not survive this repo's `strict` config (see the comment on
 * that line). Nothing about the runtime behaviour differs from the pin.
 *
 * **`remove()` returns the removed item synchronously, by closure capture.**
 * `remove` declares a local `result`, calls `setState` with an updater that
 * assigns `result = first` and returns the tail, and then returns `result`.
 * That only yields a value when React invokes the updater **eagerly**, which it
 * does solely on the idle-fiber fast path: React evaluates the reducer
 * immediately when the fiber (and its alternate) have no pending lanes, and
 * skips that evaluation as soon as a lane is already scheduled. The consequence,
 * measured in this port's test file rather than assumed: with an idle queue the
 * first `remove()` in a handler returns the head, while a **second `remove()`
 * issued in the same event handler, before React has rendered, returns
 * `undefined`** — the second updater runs only during the render, long after
 * `return result` has executed. `undefined` is also what an empty queue returns,
 * because the eager head of `[]` is `undefined`. Callers who need the value must
 * therefore remove one item per commit; the declaration `() => T` is upstream's
 * and is deliberately not narrowed. This rests on an implementation detail of
 * React's dispatcher, not on a public contract, so it is pinned by a test.
 *
 * Under `StrictMode` React double-invokes the updater to surface impurity. The
 * capture is idempotent — both invocations receive the same queue and assign the
 * same `first` — so the returned value and the removed count are unaffected.
 *
 * **`first`, `last` and `size` are getters**, so each read is evaluated against
 * the `state` of the render that created the object: they track the current
 * queue rather than a value frozen at construction. A spread of the return
 * value (`{ ...queue }`) or a `useMemo` without a state dependency would turn
 * them into snapshots, which is why neither is used here.
 *
 * **The returned object's identity is unstable by design.** A fresh object
 * literal — and therefore a fresh `add` and `remove` closure — is created on
 * every render, exactly as upstream does, so it is not a `useCallback` /
 * `useMemo` / ref candidate and must not be used as an effect or memo
 * dependency. This is the deliberate opposite of the sibling `useList` port,
 * whose action set is referentially stable on purpose; do not align the two.
 *
 * Nothing touches `window` or `document`, so the hook is SSR-safe.
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
