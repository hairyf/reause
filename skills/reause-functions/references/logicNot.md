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

The argument is a plain read-only value (upstream takes `MaybeRefOrGetter<any>`). The result is
re-evaluated on every call — there is no reactivity, so re-renders drive re-evaluation.

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
