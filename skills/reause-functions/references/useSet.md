---
category: State
---

# useSet

A real `Set` whose mutations re-render.

## Usage

```tsx
import { useSet } from '@reause/shared'

const set = useSet(['a'])

set.add('b') // re-renders; returns the same Set
set.has('b') // true
set.size // 2
set.delete('a') // re-renders; returns true
set.clear() // re-renders; returns undefined
```

## Type Declarations

```ts
/**
 * Map from react-hookz `useSet`
 * (`source/react-hookz/src/useSet/`).
 *
 * @param values Initial values for the underlying `Set` constructor. Read only
 * by the first render; `null` and `undefined` both mean "empty".
 *
 * @example
 * const set = useSet(['a'])
 * set.add('b') // re-renders; returns the same Set
 * set.has('b') // true
 * set.delete('a') // re-renders; returns true
 * set.size // 1
 */
export declare function useSet<T = any>(values?: readonly T[] | null): Set<T>
```
