---
category: State
---

# useStateHistory

Track the change history of a state automatically — every change commits a history record — also provides undo and redo functionality

## Usage

```tsx
import { useStateHistory } from '@reause/core'
import { useState } from 'react'

const [count, setCount] = useState(0)
const { history, undo, redo, canUndo, canRedo } = useStateHistory({
  value: count,
  onChange: setCount,
})

setCount(1) // every change commits a history record

console.log(history)
/* [
  { snapshot: 1, timestamp: 1601912898062 },
  { snapshot: 0, timestamp: 1601912898061 }
] */

undo() // count back to the previous record
redo() // count forward again
```

Internally, an effect is used to trigger a history point when the state is modified. This means that history points are triggered asynchronously batching modifications in the same "tick".

You can use `undo` to reset the state to the last history point.

### Objects / arrays

When working with objects or arrays, since changing their attributes does not change the reference, it will not trigger the committing. React state is normally replaced instead of mutated — the `clone` option and custom `dump` / `parse` support mutation-style sources and create clones for each history record:

```tsx
import { useStateHistory } from '@reause/core'
import { useState } from 'react'

const [target, setTarget] = useState({ foo: 1, bar: 2 })
const { history, setSource } = useStateHistory([target, setTarget], { clone: true })

setSource({ foo: 2, bar: 2 }) // committed immediately
```

#### Custom Clone Function

`useStateHistory` only embeds the minimal clone function `x => JSON.parse(JSON.stringify(x))`. To use a full featured or custom clone function, you can set up via the `clone` options.

For example, using [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone):

```tsx
import { useStateHistory } from '@reause/core'

const stateHistory = useStateHistory([target, setTarget], { clone: structuredClone })
```

Or by using [lodash's `cloneDeep`](https://lodash.com/docs/4.17.15#cloneDeep):

```tsx
import { useStateHistory } from '@reause/core'
import { cloneDeep } from 'lodash-es'

const stateHistory = useStateHistory([target, setTarget], { clone: cloneDeep })
```

Or a more lightweight [`klona`](https://github.com/lukeed/klona):

```tsx
import { useStateHistory } from '@reause/core'
import { klona } from 'klona'

const stateHistory = useStateHistory([target, setTarget], { clone: klona })
```

#### Custom Dump and Parse Function

Instead of using the `clone` options, you can pass custom functions to control the serialization and parsing. In case you do not need history values to be objects, this can save an extra clone when undoing. It is also useful in case you want to have the snapshots already stringified to be saved to local storage for example.

```tsx
import { useStateHistory } from '@reause/core'

const stateHistory = useStateHistory([target, setTarget], {
  dump: JSON.stringify,
  parse: JSON.parse,
})
```

### History Capacity

We will keep all the history by default (unlimited) until you explicitly clear them up, you can set the maximal amount of history to be kept by `capacity` options.

```tsx
const { history, clear } = useStateHistory([target, setTarget], {
  capacity: 15, // limit to 15 history records
})

clear() // explicitly clear all the history
```

### History WatchOptionFlush Timing

Multiple state updates in the same tick render once and collapse into a single commit carrying the final value; there is no per-assignment `flush: 'sync'` timing. You can use `commit()` in case you need to create multiple history points in the same "tick"

```tsx
import { useStateHistory } from '@reause/core'
import { useState } from 'react'

const [r, setR] = useState(0)
const { history, commit, setSource } = useStateHistory([r, setR])

setSource(1)
commit()

setSource(2)
commit()

console.log(history)
/* [
  { snapshot: 2 },
  { snapshot: 1 },
  { snapshot: 0 },
] */
```

On the other hand, you can use `batch(fn)` to generate a single history point for several operations

```tsx
import { useStateHistory } from '@reause/core'
import { useState } from 'react'

const [r, setR] = useState({ names: [], version: 1 })
const { history, batch, setSource } = useStateHistory([r, setR])

batch(() => {
  setSource(current => ({ names: [...current.names, 'Lena'], version: current.version + 1 }))
})

console.log(history)
/* [
  { snapshot: { names: [ 'Lena' ], version: 2 },
  { snapshot: { names: [], version: 1 },
] */
```

## Recommended Readings

- [History and Persistence](https://patak.dev/vue/history-and-persistence.html) - by [@patak-dev](https://github.com/patak-dev)
