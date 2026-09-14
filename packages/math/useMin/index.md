---
category: '@Math'
---

# useMin

Reactive `Math.min`

## Usage

```tsx
import { useMin } from '@reause/math'

const array = [1, 2, 3, 4]
const min = useMin(array) // 1
```

```tsx
import { useMin } from '@reause/math'

const min = useMin(1, 3, 2) // 1
```
