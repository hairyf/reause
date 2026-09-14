---
category: '@Math'
---

# useFloor

Reactive `Math.floor`

## Usage

```tsx
import { useFloor } from '@reause/math'

const result = useFloor(45.95) // 45
```

`value` is a plain read-only `number`. Re-render with a
new value — e.g. from `useState` — and the hook recomputes:

```tsx
import { useFloor } from '@reause/math'
import { useState } from 'react'

const [value, setValue] = useState(45.95)
const result = useFloor(value) // 45

setValue(-45.05) // triggers a re-render
```
