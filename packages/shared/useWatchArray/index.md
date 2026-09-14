---
category: Watch
---

# useWatchArray

Watches an array value and reports which items were added and removed since the previous list

## Usage

```tsx
import { useWatchArray } from '@reause/shared'

useWatchArray(list, (newList, oldList, added, removed) => {
  console.log(`added: ${added}`, `removed: ${removed}`)
})

// fire once on mount with the current list
useWatchArray(list, (newList, oldList, added, removed) => {
  console.log(newList, oldList, added, removed)
}, { immediate: true })
```
