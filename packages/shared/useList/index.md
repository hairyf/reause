---
category: State
---

# useList

Tracks an array and returns it with a stable set of immutable mutators.

## Usage

```tsx
import { useList } from '@reause/shared'

const [list, { push, updateAt, upsert, sort, filter, removeAt, clear, reset }] = useList([1, 2, 3])

push(4) // [1, 2, 3, 4]
updateAt(0, 9) // [9, 2, 3, 4]
upsert(item => item === 2, 7) // replaces the match → [9, 7, 3, 4]; pushes the item when nothing matches
sort((a, b) => b - a) // [9, 7, 4, 3]
filter(item => item > 3) // [9, 7, 4]
removeAt(0) // [7, 4]
clear() // []
reset() // [1, 2, 3]
```
