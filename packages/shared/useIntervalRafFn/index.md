---
category: Animation
---

# useIntervalRafFn

Fire a callback repeatedly on animation frames, at a delay rounded up to the next frame

## Usage

```tsx
import { useIntervalRafFn } from '@reause/shared'

const clear = useIntervalRafFn(() => {
  /* runs again and again, on the first frame at or after 1000ms since the last run */
}, 1000)

// stop the loop
clear()
```
