---
category: Lifecycle
---

# useIsomorphicLayoutEffect

`useLayoutEffect` on the client, `useEffect` on the server

## Usage

```tsx
import { useIsomorphicLayoutEffect } from '@reause/shared'
import { useRef } from 'react'

const boxRef = useRef<HTMLDivElement>(null)

useIsomorphicLayoutEffect(() => {
  // on the client this runs after the DOM is committed and before the browser
  // paints — a real measurement, in the same frame
  setWidth(boxRef.current?.getBoundingClientRect().width ?? 0)
}, [])
```
