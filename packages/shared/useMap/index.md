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
