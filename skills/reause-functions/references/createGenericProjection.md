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

## Type Declarations

```ts
/**
 * A projector built by `createGenericProjection`: takes the input value and returns the projected
 * value of type `T`.
 */
export type UseProjection<F, T> = (input: F) => T
/**
 * Map from @vueuse/math `createGenericProjection`.
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const projector = createGenericProjection(
 *   [0, 10],
 *   ['low', 'high'],
 *   (input, from, to) => (input > (from[0] + from[1]) / 2 ? to[1] : to[0]),
 * )
 * projector(8) // 'high'
 */
export declare function createGenericProjection<F = number, T = number>(
  fromDomain: readonly [F, F],
  toDomain: readonly [T, T],
  projector: ProjectorFunction<F, T>,
): UseProjection<F, T>
```
