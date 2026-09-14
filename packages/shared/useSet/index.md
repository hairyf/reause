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
