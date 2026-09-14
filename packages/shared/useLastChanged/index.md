---
category: State
---

# useLastChanged

Records the timestamp of the last change

## Usage

```tsx
import { useLastChanged } from '@reause/shared'
import { useState } from 'react'

const [a, setA] = useState(0)
const lastChanged = useLastChanged(a)
// note: lastChanged is a plain number (or null), not a ref

setA(1)
// the change is not recorded synchronously — `lastChanged` becomes the
// timestamp on the render after the change, so a read right after `setA(1)`
// still sees `null`
```

Seed the returned value before any change is recorded with `initialValue`
(upstream: `initialValue`):

```tsx
const lastChanged = useLastChanged(input, { initialValue: Date.now() - 1000 * 60 * 5 })
```
