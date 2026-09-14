---
category: Lifecycle
---

# useShallowCompareEffect

`useEffect` whose dependency list is compared by one-level (shallow) equality instead of reference identity.

## Usage

```tsx
import { useShallowCompareEffect } from '@reause/shared'

const options = { step: 2 } // rebuilt on every render — shallow-equal to the last one

useShallowCompareEffect(() => {
  inc(options.step)
}, [options]) // runs on mount and whenever `step` changes, not on every re-render
```
