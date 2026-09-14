---
category: '@Math'
---

# logicNot

`NOT` condition for values

## Usage

```tsx
import { logicNot } from '@reause/math'

const notTrue = logicNot(true) // false — re-evaluated on every call
const notZero = logicNot(0) // true
```

## Type Declarations

```ts
/**
 * Map from @vueuse/math `logicNot`
 * (`source/vueuse/packages/math/logicNot/`).
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * logicNot(true) // false
 * logicNot(0) // true
 * logicNot('foo') // false
 *
 * @param v - A value to negate.
 * @returns `true` when the value is falsy, `false` otherwise.
 */
export declare function logicNot(v: any): boolean
```
