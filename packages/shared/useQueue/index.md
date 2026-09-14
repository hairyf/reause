---
category: State
---

# useQueue

State hook that implements a simple FIFO queue.

## Usage

```tsx
import { useQueue } from '@reause/shared'

const queue = useQueue([1, 2, 3])

queue.first // 1
queue.last // 3
queue.size // 3
queue.add(4) // the queue becomes [1, 2, 3, 4]
queue.remove() // 1 — while the queue's fiber is idle, see below
queue.size // 3
```
