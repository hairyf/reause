---
category: '@Math'
---

# useFloor

Reactive `Math.floor`

## Usage

```tsx
import { useFloor } from '@reause/math'

const result = useFloor(45.95) // 45
```

`value` is a plain read-only `number` (upstream takes `MaybeRefOrGetter<number>`). Re-render with a
new value — e.g. from `useState` — and the hook recomputes:

```tsx
import { useFloor } from '@reause/math'
import { useState } from 'react'

const [value, setValue] = useState(45.95)
const result = useFloor(value) // 45

setValue(-45.05) // triggers a re-render
```

## Type Declarations

```ts
/**
 * Map from @vueuse/math `useFloor`
 * (`source/vueuse/packages/math/useFloor/`).
 *
 * @see https://vueuse.org/math/useFloor/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useFloor(45.95) // 45
 *
 * @param value - The number to floor.
 * @returns The floor of the value.
 */
export declare function useFloor(value: number): number
```
