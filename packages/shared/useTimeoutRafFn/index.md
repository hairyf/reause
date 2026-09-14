---
category: Animation
---

# useTimeoutRafFn

Fire a callback once on the first animation frame at or after a delay, then stop

## Usage

```tsx
import { useTimeoutRafFn } from '@reause/shared'

const clear = useTimeoutRafFn(() => {
  /* runs once, on the first frame at or after 1000ms */
}, 1000)

// cancel the pending timeout before the deadline
clear()
```
