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

## Argument Forms

Arguments are plain read-only numbers (upstream takes `MaybeRefOrGetter<number>[]`). The
single-array form accepts a `readonly number[]`:

```tsx
useMin([1, 2, 3]) // array
useMin(1, 2, 3) // variadic
useMin([1, 2, 3] as const) // readonly array
```

Re-render with new values — e.g. from `useState` — and the hook recomputes.

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
