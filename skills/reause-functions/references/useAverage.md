---
category: '@Math'
---

# useAverage

Get the average of an array reactively

## Usage

```tsx
import { useAverage } from '@reause/math'

const array = [1, 2, 3]
const averageValue = useAverage(array) // 2
```

```tsx
import { useAverage } from '@reause/math'

const averageValue = useAverage(1, 3) // 2
```

## Type Declarations

```ts
/**
 * Map from @vueuse/math `useAverage`
 * (`source/vueuse/packages/math/useAverage/`).
 *
 * @see https://vueuse.org/math/useAverage/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const array = [1, 2, 3, 4]
 * const average = useAverage(array) // 2.5
 *
 * const average2 = useAverage(1, 3, 2) // 2
 *
 * @param array - An array of numbers.
 * @returns The average of the given numbers (`0` when called with no arguments).
 */
export declare function useAverage(array: readonly number[]): number
export declare function useAverage(...args: number[]): number
```
