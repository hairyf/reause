---
category: '@Math'
related: useProjection, createGenericProjection
---

# createProjection

Reactive numeric projection from one domain to another.

## Usage

```tsx
import { createProjection } from '@reause/math'
import { useState } from 'react'

const useProjector = createProjection([0, 10], [0, 100])
const [input, setInput] = useState(0)
const projected = useProjector(input) // 0

setInput(5) // projected === 50 on the next render
setInput(10) // projected === 100 on the next render
```

## Type Declarations

```ts
/**
 * Map from @vueuse/math `createProjection`.
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const projector = createProjection([0, 10], [0, 100])
 * projector(5) // 50
 */
export declare function createProjection(
  fromDomain: readonly [number, number],
  toDomain: readonly [number, number],
  projector?: ProjectorFunction<number, number>,
): UseProjection<number, number>
```
