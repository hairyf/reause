---
category: Lifecycle
---

# useIsFirstRender

`true` on the very first render of a component instance and `false` on every render after it.

## Usage

```tsx
import { useIsFirstRender } from '@reause/shared'
import { useEffect } from 'react'

function Query() {
  const isFirstRender = useIsFirstRender()

  useEffect(() => {
    // skip the mount render, then react to every change after it
    if (!isFirstRender)
      refetch()
  }, [deps])
}
```
