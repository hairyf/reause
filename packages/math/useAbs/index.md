---
category: '@Math'
---

# useAbs

Reactive `Math.abs`

## Usage

```tsx
import { useAbs } from '@reause/math'

const result = useAbs(-23) // 23
```

`value` is a plain read-only `number`. Re-render with a
new value — e.g. from `useState` — and the hook recomputes:

```tsx
import { useAbs } from '@reause/math'
import { useState } from 'react'

const [value, setValue] = useState(-23)
const result = useAbs(value) // 23

setValue(23) // triggers a re-render
```
