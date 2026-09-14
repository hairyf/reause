---
category: Utilities
---

# isDefined

Non-nullish checking type guard for React ref objects and plain values

## Usage

```tsx
import { isDefined } from '@reause/shared'
import { useRef } from 'react'

const example = useRef(Math.random() ? 'example' : undefined) // RefObject<string | undefined>

if (isDefined(example))
  example.current // string — narrowed by the type guard
```
