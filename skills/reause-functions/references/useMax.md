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

## Argument Forms

Arguments are plain read-only numbers (upstream takes `MaybeRefOrGetter<number>[]`). The
single-array form accepts a `readonly number[]`:

```tsx
useMax([1, 2, 3]) // array
useMax(1, 2, 3) // variadic
useMax([1, 2, 3] as const) // readonly array
```

Re-render with new values — e.g. from `useState` — and the hook recomputes.

## Type Declarations

```ts
/**
 * Map from @vueuse/math `useMax`
 * (`source/vueuse/packages/math/useMax/`).
 *
 * @see https://vueuse.org/math/useMax/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const array = [1, 2, 3, 4]
 * const max = useMax(array) // 4
 *
 * const max2 = useMax(1, 3, 2) // 3
 *
 * @param array - An array of values.
 * @returns The maximum of the given values (`Number.NEGATIVE_INFINITY` when
 * called with no arguments).
 */
export declare function useMax(array: readonly number[]): number
export declare function useMax(...args: number[]): number
```
