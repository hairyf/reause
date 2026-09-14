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

## Type Declarations

```ts
export interface SyncStatesOptions {
  /**
   * Timing for syncing, same as watch's `flush` option.
   *
   * React note: there is no React equivalent — effects always run after commit, so `'sync'` /
   * `'pre'` / `'post'` are accepted for upstream signature compatibility and all behave
   * identically.
   *
   * @default 'sync'
   */
  flush?: "sync" | "pre" | "post"
  /**
   * Watch deeply.
   *
   * React note: no React equivalent — a write through a setter / `onChange` updates the target only
   * on the following commit, so nested mutations cannot be observed (only the source value as a
   * whole is compared, via `Object.is`). Accepted for upstream signature compatibility.
   *
   * @default false
   */
  deep?: boolean
  /**
   * Sync values immediately (on mount).
   *
   * @default true
   */
  immediate?: boolean
}
/**
 * Map from @vueuse/shared `syncRefs`
 * (`source/vueuse/packages/shared/syncRefs/`).
 *
 * @example
 * function Form() {
 *   const [source, setSource] = useState('hello')
 *   const [target, setTarget] = useState('target')
 *
 *   const stop = syncStates(source, [target, setTarget])
 *
 *   // during the first render `target` is still 'target' — the sync effect
 *   // runs after the commit, so the source reaches the target only once the
 *   // component has mounted (target === 'hello' afterwards).
 *   // Calling `setSource('foo')` re-renders and the effect then copies 'foo'
 *   // into the target state on the following commit.
 *
 *   stop()
 * }
 */
export declare function syncStates<T>(
  source: State<T>,
  targets: State<T> | State<T>[],
  options?: SyncStatesOptions,
): () => void
```
