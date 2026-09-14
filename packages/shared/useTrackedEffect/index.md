---
category: Lifecycle
---

# useTrackedEffect

`useEffect` that also reports **which** dependencies changed.

## Usage

```tsx
import { useTrackedEffect } from '@reause/shared'

// one effect that refetches several things, reacting only to the dep that moved
useTrackedEffect((changes, previousDeps, currentDeps) => {
  if (changes?.includes(0))
    refetchA()
  if (changes?.includes(1))
    refetchB()
}, [a, b])
```
