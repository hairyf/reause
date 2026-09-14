---
title: useStateManualHistory
category: State
description: Manually track the change history of a state when the user calls commit()
---

# useStateManualHistory

Manually track the change history of a state when the user calls `commit()`, also provides undo and redo functionality

## Usage

```tsx
import { useStateManualHistory } from '@reause/core'
import { useState } from 'react'

const [count, setCount] = useState(0)
const { history, commit, undo, redo, canUndo, canRedo, setSource } = useStateManualHistory([count, setCount])

setSource(count + 1)
commit()

console.log(history)
/* [
  { snapshot: 1, timestamp: 1601912898062 },
  { snapshot: 0, timestamp: 1601912898061 }
] */

undo() // count back to 0
```

The source is the controlled `[state, setState]` tuple of an existing `useState`; use `setSource()` (value or updater form, a drop-in for `setState`) for updates that must be visible to a manual `commit()` in the same tick.

You can use `undo` to reset the state to the last history point.

### History of mutable objects

If you are going to mutate the source, you need to pass a custom clone function or use `clone` `true` as a param, that is a shortcut for a minimal clone function `x => JSON.parse(JSON.stringify(x))` that will be used in both `dump` and `parse`.

```tsx
import { useStateManualHistory } from '@reause/core'
import { useState } from 'react'

const [target, setTarget] = useState({ foo: 1, bar: 2 })
const { history, commit, setSource } = useStateManualHistory([target, setTarget], { clone: true })

// prefer replacing the state in React…
setSource({ foo: 2, bar: 2 })
commit()

// …but a mutated source is snapshotted correctly as well
target.foo += 1
commit()
```

### Custom Clone Function

To use a full featured or custom clone function, you can set up via the `clone` options.

For example, using [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone):

```tsx
import { useStateManualHistory } from '@reause/core'

const stateHistory = useStateManualHistory([target, setTarget], { clone: structuredClone })
```

Or by using [lodash's `cloneDeep`](https://lodash.com/docs/4.17.15#cloneDeep):

```tsx
import { useStateManualHistory } from '@reause/core'
import { cloneDeep } from 'lodash-es'

const stateHistory = useStateManualHistory([target, setTarget], { clone: cloneDeep })
```

Or a more lightweight [`klona`](https://github.com/lukeed/klona):

```tsx
import { useStateManualHistory } from '@reause/core'
import { klona } from 'klona'

const stateHistory = useStateManualHistory([target, setTarget], { clone: klona })
```

### Custom Dump and Parse Function

Instead of using the `clone` options, you can pass custom functions to control the serialization and parsing. In case you do not need history values to be objects, this can save an extra clone when undoing. It is also useful in case you want to have the snapshots already stringified to be saved to local storage for example.

```tsx
import { useStateManualHistory } from '@reause/core'

const stateHistory = useStateManualHistory([target, setTarget], {
  dump: JSON.stringify,
  parse: JSON.parse,
})
```

### History Capacity

We will keep all the history by default (unlimited) until you explicitly clear them up, you can set the maximal amount of history to be kept by `capacity` options.

```tsx
const { history, commit, clear } = useStateManualHistory([target, setTarget], {
  capacity: 15, // limit to 15 history records
})

clear() // explicitly clear all the history
```

## Type Declarations

```ts
export interface UseRefHistoryRecord<T> {
  snapshot: T
  timestamp: number
}
export interface UseStateManualHistoryOptions<Raw, Serialized = Raw> {
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
}
export interface UseStateManualHistoryControls<Raw, Serialized = Raw> {
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
   * Undo changes — restore the source to the previous history record
   */
  undo: () => void
  /**
   * Redo changes — restore the source to the next history record
   */
  redo: () => void
  /**
   * Clear all the history
   */
  clear: () => void
  /**
   * Reset the source to the last history point without recording
   */
  reset: () => void
  /**
   * Tracked setter for the source state (value or updater form, like `setState`). Prefer it over
   * your own setter when the update should be visible to `commit()` in the same tick — see the
   * hook's JSDoc.
   */
  setSource: Dispatch<SetStateAction<Raw>>
}
export interface UseStateManualHistoryReturn<
  Raw,
  Serialized = Raw,
> extends UseStateManualHistoryControls<Raw, Serialized> {
  /**
   * An array of history records for undo, newest comes first
   */
  history: UseRefHistoryRecord<Serialized>[]
  /**
   * Create a new history record immediately for the current value
   */
  commit: () => void
}
/**
 * Map from @vueuse/core `useManualRefHistory`
 * (`source/vueuse/packages/core/useManualRefHistory/`).
 *
 * @example
 * const [count, setCount] = useState(0)
 * const { history, commit, undo, redo, canUndo, canRedo } = useStateManualHistory([count, setCount])
 *
 * setCount(count + 1)
 * commit() // record the new value
 * undo() // count back to the previous record
 */
export declare function useStateManualHistory<Raw, Serialized = Raw>(
  state: State<Raw>,
  options?: UseStateManualHistoryOptions<Raw, Serialized>,
): UseStateManualHistoryReturn<Raw, Serialized>
```
