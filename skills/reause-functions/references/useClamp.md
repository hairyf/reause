---
category: '@Math'
---

# useClamp

Reactively clamp a value between two other values.

## Usage

```tsx
import { useClamp } from '@reause/math'
import { useState } from 'react'

const [min, setMin] = useState(0)
const [max, setMax] = useState(10)
const [value, setValue] = useClamp(0, min, max)

setValue(15) // value is 10
setValue(-5) // value is 0
```

### Writable Ref

`value` seeds the hook's internal state; the returned setter clamps on write:

```tsx
import { useClamp } from '@reause/math'

const [clamped, setClamped] = useClamp(0, 0, 10)

setClamped(15) // clamped is 10
setClamped(-5) // clamped is 0
```

### Reactive Bounds

`value`, `min` and `max` are plain read-only numbers (upstream takes
`MaybeRefOrGetter<number>`). Bounds are re-resolved on every render, so shrinking `max` re-clamps
the current value:

```tsx
import { useClamp } from '@reause/math'
import { useState } from 'react'

const [max, setMax] = useState(10)
const [clamped] = useClamp(5, 0, max)

setMax(3) // clamped is 3 on the next render
```

## Type Declarations

```ts
/**
 * Map from @vueuse/math `useClamp`
 * (`source/vueuse/packages/math/useClamp/`).
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const [value, setValue] = useClamp(0, 0, 10)
 * setValue(15) // value is 10
 * setValue(-5) // value is 0
 *
 * @param value - The value to clamp.
 * @param min - The lower bound.
 * @param max - The upper bound.
 * @returns A `[value, setValue]` pair; `setValue` clamps into `[min, max]`.
 */
export declare function useClamp(
  value: number,
  min: number,
  max: number,
): [number, (value: number) => void]
```
