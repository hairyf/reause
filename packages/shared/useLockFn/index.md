---
category: Side-effects
---

# useLockFn

Add a lock to an async function so overlapping calls are dropped.

## Usage

```tsx
import { useLockFn } from '@reause/shared'

const submit = useLockFn(async (id: string) => {
  await api.submit(id)
})

submit('a') // runs
submit('b') // dropped — resolves to `undefined`, does not reject
```
