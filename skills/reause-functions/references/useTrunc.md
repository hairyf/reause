---
category: '@Math'
---

# useTrunc

Truncates a number, removing the fractional digits toward zero

## Usage

```tsx
import { useTrunc } from '@reause/math'

const result1 = useTrunc(0.95) // 0
const result2 = useTrunc(-2.34) // -2
```

`value` is a plain read-only `number`. Re-render with a
new value — e.g. from `useState` — and the hook recomputes:

```tsx
import { useTrunc } from '@reause/math'
import { useState } from 'react'

const [value, setValue] = useState(0.95)
const result = useTrunc(value) // 0

setValue(-2.34) // triggers a re-render
```

## Type Declarations

```ts
/**
 * Map from @vueuse/math `useTrunc`
 * (`source/vueuse/packages/math/useTrunc/`).
 *
 * @see https://vueuse.org/math/useTrunc/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useTrunc(0.95) // 0
 *
 * @param value - The number to truncate.
 * @returns The truncated number.
 */
export declare function useTrunc(value: number): number
```
