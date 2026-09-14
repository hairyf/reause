---
category: Reactivity
related: syncStates
---

# syncState

Two-way state synchronization between two writable `State<T>` sources

## Usage

```tsx
import { syncState } from '@reause/shared'
import { useState } from 'react'

function App() {
  const [a, setA] = useState('a')
  const [b, setB] = useState('b')

  const stop = syncState(
    { value: a, onChange: setA },
    { value: b, onChange: setB },
  )

  console.log(a) // a

  setB('foo') // then the component re-renders

  console.log(a) // foo

  setA('bar') // then the component re-renders

  console.log(b) // bar

  // stop()
}
```

### One directional

```tsx
import { syncState } from '@reause/shared'

// right follows left
const stopLTR = syncState(
  { value: a, onChange: setA },
  { value: b, onChange: setB },
  { direction: 'ltr' },
)

// left follows right
const stopRTL = syncState(
  { value: a, onChange: setB },
  { value: b, onChange: setA },
  { direction: 'rtl' }
)
```

### Custom Transform

```tsx
import { syncState } from '@reause/shared'
import { useState } from 'react'

const [a, setA] = useState(10)
const [b, setB] = useState(2)

const stop = syncState(
  { value: a, onChange: setA },
  { value: b, onChange: setB },
  {
    transform: {
      ltr: left => left * 2,
      rtl: right => right / 2,
    },
  }
)

console.log(a) // 10
console.log(b) // 20
```

## Type Declarations

```ts
export type SyncStateDirection = "both" | "ltr" | "rtl"
export interface SyncStateTransform<L, R> {
  ltr: (left: L) => R
  rtl: (right: R) => L
}
export interface SyncStateOptions<L, R, D extends SyncStateDirection = "both"> {
  /**
   * Timing for syncing, same as watch's `flush` option.
   *
   * React note: no React equivalent — effects always run after commit, so `'sync'` / `'pre'` /
   * `'post'` are accepted for upstream signature compatibility and all behave identically.
   *
   * @default 'sync'
   */
  flush?: "sync" | "pre" | "post"
  /**
   * Watch deeply.
   *
   * React note: no React equivalent — a `.current` write never schedules a re-render by itself, so
   * nested mutations cannot be observed (only the value as a whole is compared, via `Object.is`).
   * Accepted for upstream signature compatibility.
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
  /**
   * Direction of syncing.
   *
   * @default 'both'
   */
  direction?: D
  /**
   * Value convertors applied on the way to the other side: `ltr` maps a left value before it is
   * written into the right state, `rtl` maps a right value before it is written into the left
   * state. A missing convertor falls back to identity.
   */
  transform?: Partial<SyncStateTransform<L, R>>
}
/**
 * Map from @vueuse/shared `syncRef`
 * (`source/vueuse/packages/shared/syncRef/`).
 *
 * @example
 * const [a, setA] = useState('a')
 * const [b, setB] = useState('b')
 *
 * const stop = syncState([a, setA], [b, setB])
 *
 * console.log(a) // a
 *
 * setB('foo') // then the component re-renders
 * console.log(a) // foo
 *
 * setA('bar') // then the component re-renders
 * console.log(b) // bar
 *
 * stop()
 */
export declare function syncState<L, R, D extends SyncStateDirection = "both">(
  left: State<L>,
  right: State<R>,
  options?: SyncStateOptions<L, R, D>,
): () => void
```
