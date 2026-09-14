---
category: Watch
---

# useWatchDeep

Shorthand for watching a value with `{ deep: true }` — invokes the callback only when the value differs **deeply** from the previous one

## Usage

```tsx
import { useWatchDeep } from '@reause/shared'
import { useState } from 'react'

const [obj, setObj] = useState({ foo: { bar: { deep: 5 } } })
const [count, setCount] = useState(0)

useWatchDeep(obj, (updated) => {
  console.log(updated)
})

// replaces a nested value — the callback fires
setObj({ foo: { bar: { deep: 10 } } })

// deep-equal reassignment — the callback stays silent
setObj({ foo: { bar: { deep: 10 } } })

// array sources and `immediate` work like `useWatch`
useWatchDeep([count, obj], (value, oldValue) => {
  console.log(value, oldValue)
})
```

## Helpers

`deepEqual` and `deepClone` are exported from `@reause/shared` and also used
by core hooks that need deep change detection (e.g. `useCloned`):

```tsx
import { deepClone, deepEqual } from '@reause/shared'

deepEqual({ foo: 1 }, { foo: 1 }) // true
deepEqual(deepClone({ foo: { bar: 1 } }), { foo: { bar: 1 } }) // true
```

## Type Declarations

```ts
/**
 * Structural equality, mirroring the semantics of test `toEqual`: primitives are compared with
 * `Object.is`, and `Date`, `RegExp`, `Array`, `Map`, `Set` and objects (plain or class instances)
 * are compared by contents. Functions compare by reference, and `Map` keys are matched by reference
 * because key lookups cannot deep-match, while `Map` values and `Set` items are compared deeply.
 *
 * Shared single source of truth — used by {@link useWatchDeep} and imported from `@reause/shared`
 * by core hooks that need deep change detection (e.g. `useCloned`).
 */
export declare function deepEqual(a: unknown, b: unknown): boolean
/**
 * Deep clone pairing with {@link deepEqual}'s type coverage — `Date`, `RegExp`, `Array`, `Map`,
 * `Set` and objects (plain or class instances) are copied structurally, primitives and functions
 * pass through. Used to snapshot a live value into an isolated baseline for change detection (e.g.
 * `useCloned`'s source / cloned baselines, which must stay unaffected by in-place mutations).
 */
export declare function deepClone<T>(value: T): T
/**
 * Map from @vueuse/shared `watchDeep`.
 *
 * @example
 * ```ts
 * const [obj, setObj] = useState({ foo: { bar: { deep: 5 } } })
 * useWatchDeep(obj, (value, oldValue) => console.log(value, oldValue))
 * setObj({ foo: { bar: { deep: 10 } } }) // fires — nested value changed
 * setObj({ foo: { bar: { deep: 10 } } }) // silent — deep-equal reassignment
 * ```
 */
export declare function useWatchDeep<T extends any[]>(
  source: readonly [...T],
  callback: UseWatchCallback<[...T]>,
  options?: UseWatchOptions,
): void
export declare function useWatchDeep<T>(
  source: T,
  callback: UseWatchCallback<T>,
  options?: UseWatchOptions,
): void
```
