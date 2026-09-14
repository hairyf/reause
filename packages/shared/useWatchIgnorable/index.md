---
category: Watch
---

# useWatchIgnorable

Ignorable watch — extended watch that returns `ignoreUpdates(updater)` / `ignorePrevAsyncUpdates()` / `stop` to ignore particular updates to the source

## Usage

```tsx
import { useWatchIgnorable } from '@reause/shared'
import { useState } from 'react'

const [source, setSource] = useState('foo')

const { stop, ignoreUpdates } = useWatchIgnorable(
  source,
  v => console.log(`Changed to ${v}!`),
)

setSource('bar') // logs: Changed to bar!

ignoreUpdates(() => {
  setSource('foobar')
}) // (nothing logged)

setSource('hello') // logs: Changed to hello!
```

> React batches state updates within one event handler, so an ignored update and
> a non-ignored update in the same batch collapse into a single render, which
> the ignore barrier skips as a whole. Let the ignored update's batch commit
> (return from the event handler) before making changes that must fire.

```tsx
ignoreUpdates(() => {
  setSource('ignored')
})

// same batch as the ignored update → collapsed into it and skipped
setSource('logged') // (nothing logged)

// separate batch → the barrier was consumed, so this fires
setSource('after') // logs: Changed to after!
```

## `ignorePrevAsyncUpdates`

`ignorePrevAsyncUpdates()` ignores the changes made since the last time the callback fired — as long as no other changes follow:

```tsx
const { ignorePrevAsyncUpdates } = useWatchIgnorable(
  source,
  v => console.log(`Changed to ${v}!`),
)

setSource('good')
setSource('by')
ignorePrevAsyncUpdates() // (nothing logged for 'by')

setSource('prev')
ignorePrevAsyncUpdates()
setSource('after') // logs: Changed to after!
```
