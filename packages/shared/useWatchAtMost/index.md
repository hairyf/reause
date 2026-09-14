---
category: Watch
---

# useWatchAtMost

Like `useWatch`, but the callback fires at most `count` times

## Usage

Similar to `useWatch` with an extra option `count` which sets the number of
times the callback is triggered. After the count is reached, further changes
are ignored.

```tsx
import { useWatchAtMost } from '@reause/shared'
import { useState } from 'react'

const [num, setNum] = useState(0)

const { count, stop, pause, resume } = useWatchAtMost(
  num,
  () => { console.log('trigger!') }, // triggered at most 3 times
  {
    count: 3, // the number of times triggered
  },
)
```
