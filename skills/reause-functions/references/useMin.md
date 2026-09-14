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

## Type Declarations

```ts
/**
 * Map from @vueuse/math `useMin`
 * (`source/vueuse/packages/math/useMin/`).
 *
 * @see https://vueuse.org/math/useMin/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const array = [1, 2, 3, 4]
 * const min = useMin(array) // 1
 *
 * const min2 = useMin(1, 3, 2) // 1
 *
 * @param array - A set of numbers to find the minimum of.
 * @returns The minimum of the given numbers, or `Number.POSITIVE_INFINITY` when
 * no arguments are passed (matching `Math.min()` semantics).
 */
export declare function useMin(array: readonly number[]): number
export declare function useMin(...args: number[]): number
```
