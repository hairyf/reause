---
category: Watch
---

# useWatchOnce

Shorthand for watching value with `{ once: true }`

## Usage

Similar to `useWatch`, but the callback triggers only once — further changes
are ignored. The underlying effect stays alive; only the wrapped callback
stops firing, so the source keeps being tracked without re-invoking it.

```tsx
import { useWatchOnce } from '@reause/shared'

useWatchOnce(source, () => {
  // triggers only once
  console.log('source changed!')
})
```
