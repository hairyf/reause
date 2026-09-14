---
category: '@Math'
---

# useTrunc

Truncates a number, removing the fractional digits toward zero

## Usage

```tsx
import { useTrunc } from '@reause/math'

const result1 = useTrunc(0.95) // 0
const result2 = useTrunc(-2.34) // -2
```

`value` is a plain read-only `number`. Re-render with a
new value — e.g. from `useState` — and the hook recomputes:

```tsx
import { useTrunc } from '@reause/math'
import { useState } from 'react'

const [value, setValue] = useState(0.95)
const result = useTrunc(value) // 0

setValue(-2.34) // triggers a re-render
```
