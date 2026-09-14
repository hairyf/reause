---
category: Reactivity
related: syncState
---

# syncStates

Keep target state(s) in sync with a source value

## Usage

```tsx
import { syncStates } from '@reause/shared'
import { useState } from 'react'

function Form() {
  const [source, setSource] = useState('hello')
  const [target, setTarget] = useState('target')

  const stop = syncStates(source, {
    value: target,
    onChange: setTarget,
  })

  // the sync effect runs after the commit, not during render — at this point
  // `target` is still 'target'; once the component has mounted it becomes
  // 'hello'

  setSource('foo') // the re-render's effect copies 'foo' into the target state

  // stop()
}
```

### Sync with multiple targets

You can also pass an array of writable `State<T>` sources to sync.

```tsx
import { syncStates } from '@reause/shared'
import { useState } from 'react'

function Form() {
  const [source, setSource] = useState('hello')
  const [target1, setTarget1] = useState('target1')
  const [target2, setTarget2] = useState('target2')

  const stop = syncStates(source, [
    { value: target1, onChange: setTarget1 },
    { value: target2, onChange: setTarget2 },
  ])

  // the sync effect runs after the commit — target1/target2 are still
  // 'target1'/'target2' here and become 'hello' once the component has mounted

  setSource('foo') // the re-render's effect copies 'foo' into both targets

  stop()
}
```
