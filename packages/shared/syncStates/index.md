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

  const stop = syncStates(source, [target, setTarget])

  // the sync effect runs after the commit, not during render — at this point
  // `target` is still 'target'; once the component has mounted it becomes
  // 'hello'

  setSource('foo') // the re-render's effect copies 'foo' into the target state

  // stop()
}
```

`syncStates` is a hook: call it unconditionally at the top level of a component (or another hook). The `source` is a `State<T>` resolved with `toValue` — a plain value, a getter, a `[value, setter]` tuple or a `{ value, onChange }` pair; the effect compares it after every commit and writes changes into each target. Targets are writable `State<T>` sources, written back through their writable form (tuple setter or `onChange` callback); a plain value or getter has no write path and is treated as read-only.

### Sync with multiple targets

You can also pass an array of writable `State<T>` sources to sync.

```tsx
import { syncStates } from '@reause/shared'
import { useState } from 'react'

function Form() {
  const [source, setSource] = useState('hello')
  const [target1, setTarget1] = useState('target1')
  const [target2, setTarget2] = useState('target2')

  const stop = syncStates(source, [[target1, setTarget1], [target2, setTarget2]])

  // the sync effect runs after the commit — target1/target2 are still
  // 'target1'/'target2' here and become 'hello' once the component has mounted

  setSource('foo') // the re-render's effect copies 'foo' into both targets

  stop()
}
```

## Options

The options mirror upstream's `SyncRefsOptions`. `flush` and `deep` are accepted for signature compatibility but have no React behavior — effects always run after commit, and only the value as a whole (compared with `Object.is`) can be observed, never nested mutation.

```ts
export interface SyncStatesOptions {
  /**
   * Timing for syncing, same as watch's flush option
   *
   * @default 'sync'
   */
  flush?: 'sync' | 'pre' | 'post'
  /**
   * Watch deeply
   *
   * @default false
   */
  deep?: boolean
  /**
   * Sync values immediately
   *
   * @default true
   */
  immediate?: boolean
}
```
