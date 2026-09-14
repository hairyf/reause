---
category: State
---

# useStateThrottledHistory

Shorthand for `useStateHistory` with throttled filter.

## Usage

This function takes the first snapshot right after the counter's value was changed and the second with a delay of 1000ms.

```tsx
import { useStateThrottledHistory } from '@reause/core'
import { useState } from 'react'

const [count, setCount] = useState(0)
const { history, undo, redo, canUndo, canRedo } = useStateThrottledHistory([count, setCount], { throttle: 1000 })

setCount(1)
// first change after a quiet window commits immediately (leading edge)

setCount(2)
// changes inside the throttle window collapse into a single trailing commit

console.log(history)
/* [
  { snapshot: 2, timestamp: 1601912898062 },
  { snapshot: 0, timestamp: 1601912898061 }
] */

undo() // count back to the previous record
```

The source is the controlled `[state, setState]` tuple of an existing `useState`; commits are driven by an effect on state changes (upstream: `useWatchIgnorable`).

## Type Declarations

```ts
export interface UseStateThrottledHistoryOptions<Raw, Serialized = Raw> {
  /**
   * Maximum number of history to be kept. Default to unlimited.
   */
  capacity?: number
  /**
   * Clone when taking a snapshot, shortcut for dump: JSON.parse(JSON.stringify(value)).
   *
   * @default false
   */
  clone?: boolean | ((value: Raw) => Raw)
  /**
   * Serialize data into the history
   */
  dump?: (value: Raw) => Serialized
  /**
   * Deserialize data from the history
   */
  parse?: (value: Serialized) => Raw
  /**
   * Throttle duration in milliseconds between history commits — re-read on every change, so passing
   * the current value of a state works naturally.
   *
   * @default 200
   */
  throttle?: number
  /**
   * Commit the latest change on the trailing edge of the throttle window. When `false`, changes
   * inside the window are dropped instead of collapsing into a trailing commit.
   *
   * @default true
   */
  trailing?: boolean
}
export interface UseStateThrottledHistoryControls<Raw, Serialized = Raw> {
  /**
   * Mirror of the source state passed to the hook
   */
  source: Raw
  /**
   * Last history point, the source can be restored to it with `reset()`
   */
  last: UseRefHistoryRecord<Serialized>
  /**
   * History records for undo, newest comes first
   */
  undoStack: UseRefHistoryRecord<Serialized>[]
  /**
   * Records array for redo
   */
  redoStack: UseRefHistoryRecord<Serialized>[]
  /**
   * If undo is possible (non empty undoStack)
   */
  canUndo: boolean
  /**
   * If redo is possible (non empty redoStack)
   */
  canRedo: boolean
  /**
   * If change tracking is enabled (flipped by `pause()` / `resume()`)
   */
  isTracking: boolean
  /**
   * Tracked setter for the source state (value or updater form, like `setState`). Prefer it over
   * your own setter when the update should be visible to `commit()` in the same tick — see
   * `useStateManualHistory`.
   */
  setSource: Dispatch<SetStateAction<Raw>>
  /**
   * Create a new history record immediately, bypassing the throttle — cancels a pending trailing
   * commit for the same change
   */
  commit: () => void
  /**
   * Clear all the history and cancel a pending trailing commit
   */
  clear: () => void
  /**
   * Reset the source to the last history point without recording
   */
  reset: () => void
  /**
   * Pause change tracking
   */
  pause: () => void
  /**
   * Resume change tracking
   *
   * @param [commitNow] if true, a history record will be created after resuming
   */
  resume: (commitNow?: boolean) => void
  /**
   * A sugar for pausing the recording within a function scope: changes made with
   * `controls.setSource()` inside `fn` are not committed during `fn`, and a single commit is
   * created after it — unless `cancel()` is called.
   *
   * @param fn
   */
  batch: (fn: (cancel: () => void) => void) => void
}
export interface UseStateThrottledHistoryReturn<
  Raw,
  Serialized = Raw,
> extends UseStateThrottledHistoryControls<Raw, Serialized> {
  /**
   * An array of history records for undo, newest comes first
   */
  history: UseRefHistoryRecord<Serialized>[]
  /**
   * Undo the last change
   */
  undo: () => void
  /**
   * Redo the last change
   */
  redo: () => void
}
/**
 * Map from @vueuse/core `useThrottledRefHistory`
 * (`source/vueuse/packages/core/useThrottledRefHistory/`).
 *
 * @example
 * const [count, setCount] = useState(0)
 * const { history, undo, redo, canUndo, canRedo } = useStateThrottledHistory([count, setCount], { throttle: 1000 })
 *
 * setCount(1) // first change after a quiet window commits immediately
 * setCount(2) // changes inside the window collapse into one trailing commit
 * undo() // count back to the previous record
 */
export declare function useStateThrottledHistory<Raw, Serialized = Raw>(
  state: State<Raw>,
  options?: UseStateThrottledHistoryOptions<Raw, Serialized>,
): UseStateThrottledHistoryReturn<Raw, Serialized>
```
