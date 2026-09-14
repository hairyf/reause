---
category: State
---

# useMap

A real `Map` whose mutations re-render.

## Usage

```tsx
import { useMap } from '@reause/shared'

const map = useMap([['a', 1]])

map.set('b', 2) // re-renders; returns the same Map
map.get('b') // 2
map.size // 2
map.delete('a') // re-renders; returns true
map.clear() // re-renders; returns undefined
```

## Type Declarations

```ts
/**
 * Map from react-hookz `useMap`
 * (`source/react-hookz/src/useMap/`).
 *
 * @param entries Initial entries for the underlying `Map` constructor. Read
 * only by the first render; `null` and `undefined` both mean "empty".
 *
 * @example
 * const map = useMap([['a', 1]])
 * map.set('b', 2) // re-renders; returns the same Map
 * map.get('b') // 2
 * map.delete('a') // re-renders; returns true
 * map.size // 1
 */
export declare function useMap<K = any, V = any>(
  entries?: ReadonlyArray<readonly [K, V]> | null,
): Map<K, V>
```
