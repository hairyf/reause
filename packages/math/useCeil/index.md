---
category: '@Math'
---

# useCeil

Reactive `Math.ceil`

## Usage

```tsx
import { useCeil } from '@reause/math'

const result1 = useCeil(0.95) // 1
const result2 = useCeil(-7.004) // -7
```

`value` is a plain read-only `number`. Re-render with a
new value — e.g. from `useState` — and the hook recomputes:

```tsx
import { useCeil } from '@reause/math'
import { useState } from 'react'

const [value, setValue] = useState(0.95)
const result = useCeil(value) // 1

setValue(-7.004) // triggers a re-render
```
