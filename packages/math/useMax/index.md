---
category: '@Math'
---

# useMax

Reactive `Math.max`

## Usage

```tsx
import { useMax } from '@reause/math'

const array = [1, 2, 3, 4]
const max = useMax(array) // 4
```

```tsx
import { useMax } from '@reause/math'

const max = useMax(1, 3, 2) // 3
```
