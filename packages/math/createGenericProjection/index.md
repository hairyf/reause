---
category: '@Math'
related: createProjection, useProjection
---

# createGenericProjection

Generic version of `createProjection`. Accepts a custom projector function to map arbitrary type of domains.

## Usage

```tsx
import { createGenericProjection } from '@reause/math'

const projector = createGenericProjection(
  [0, 10],
  ['cold', 'hot'],
  (value, fromDomain, toDomain) => (value > (fromDomain[0] + fromDomain[1]) / 2 ? toDomain[1] : toDomain[0]),
)

projector(8) // 'hot'
```
