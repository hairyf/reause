---
category: '@Math'
---

# usePrecision

Reactively set the precision of a number

## Usage

```tsx
import { usePrecision } from '@reause/math'

const result = usePrecision(3.1415, 2) // 3.14

const ceilResult = usePrecision(3.1415, 2, {
  math: 'ceil'
}) // 3.15

const floorResult = usePrecision(3.1415, 3, {
  math: 'floor'
}) // 3.141
```

`value`, `digits` and `options` are plain read-only values (upstream takes
`MaybeRefOrGetter<...>`). Re-render with new values — e.g. from `useState` — and the hook recomputes.

## Type Declarations

```ts
export interface UsePrecisionOptions {
  /**
   * Method to use for rounding.
   *
   * @default 'round'
   */
  math?: "floor" | "ceil" | "round"
}
/**
 * Map from @vueuse/math `usePrecision`
 * (`source/vueuse/packages/math/usePrecision/`).
 *
 * @see https://vueuse.org/math/usePrecision/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = usePrecision(3.1415, 2) // 3.14
 *
 * const ceilResult = usePrecision(3.1415, 2, {
 *   math: 'ceil',
 * }) // 3.15
 *
 * const floorResult = usePrecision(3.1415, 3, {
 *   math: 'floor',
 * }) // 3.141
 *
 * @param value - The value to set the precision of.
 * @param digits - The number of digits to keep.
 * @param options - The rounding method to use (`round` by default).
 * @returns The value with the applied precision.
 */
export declare function usePrecision(
  value: number,
  digits: number,
  options?: UsePrecisionOptions,
): number
```
