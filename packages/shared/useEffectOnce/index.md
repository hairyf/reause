---
category: Lifecycle
---

# useEffectOnce

Runs an effect once after the component mounts, and forwards the cleanup that effect returns.

## Usage

```tsx
import { useEffectOnce } from '@reause/shared'

useEffectOnce(() => {
  const subscription = source.subscribe()

  // forwarded to React by `useEffectOnce`: runs on unmount
  return () => subscription.unsubscribe()
})
```
