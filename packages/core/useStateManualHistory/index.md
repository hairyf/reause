---
category: State
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
