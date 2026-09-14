---
category: Lifecycle
---

# useUpdateEffect

`useEffect` that skips the first render.

## Usage

```tsx
import { useUpdateEffect } from '@reause/shared'

useUpdateEffect(() => {
  console.log('count changed, but not on mount')
}, [count])
```
