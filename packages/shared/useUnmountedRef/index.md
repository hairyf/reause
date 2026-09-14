---
category: Lifecycle
---

# useUnmountedRef

A ref that reports whether the component has unmounted.

## Usage

```tsx
import { useUnmountedRef } from '@reause/shared'

const unmountedRef = useUnmountedRef() // { current: boolean }

async function load() {
  const data = await fetchData()
  // `.current` is false while mounted and true once the component has unmounted
  if (unmountedRef.current)
    return
  setData(data)
}
```
