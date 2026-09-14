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

## Type Declarations

```ts
export interface SyncStatesOptions {
  /**
   * Timing for syncing, same as watch's `flush` option.
   *
   * React note: there is no React equivalent — effects always run after
   * commit, so `'sync'` / `'pre'` / `'post'` are accepted for upstream
   * signature compatibility and all behave identically.
   *
   * @default 'sync'
   */
  flush?: "sync" | "pre" | "post"
  /**
   * Watch deeply.
   *
   * React note: no React equivalent — a write through a setter / `onChange`
   * updates the target only on the following commit, so nested mutations
   * cannot be observed (only the
   * source value as a whole is compared, via `Object.is`). Accepted for
   * upstream signature compatibility.
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
 * Keep target state(s) in sync with a source value — React port of VueUse's
 * `syncRefs`.
 *
 * Map from @vueuse/shared `syncRefs`
 * (`source/vueuse/packages/shared/syncRefs/`), renamed `syncStates` for the
 * React port: the source is a `State<T>` — a plain value, getter,
 * `[value, setter]` tuple or `{ value, onChange }` pair (upstream:
 * `WatchSource`) — resolved with `toValue`; the targets are writable
 * `State<T>` sources written back through their writable form (tuple setter /
 * `onChange`); upstream's `flush` / `deep` / `immediate` options
 * are kept for signature compatibility.
 *
 * React Hook adaptation: upstream syncs through Vue's reactive `watch`, and
 * React has no reactive system — so `syncStates` is implemented as a hook
 * (call it unconditionally at the top of a component). Internally a
 * `useEffect` that runs after every commit compares the resolved source value
 * with the last observed one via `Object.is`; a change is written through to
 * all targets. Because the observation happens post-commit, the caller must
 * re-render (e.g. `setState`) for a new source value to reach the targets —
 * a bare mutation outside of React is never observed (see the maintainer
 * notes on reause #40 / #41). The returned `stop` function tears the
 * synchronization down; the effect also stops doing any work once the owning
 * component unmounts.
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
