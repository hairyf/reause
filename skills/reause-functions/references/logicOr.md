---
category: '@Math'
related: logicAnd, logicNot
---

# logicOr

`OR` conditions for values

## Usage

```tsx
import { logicOr } from '@reause/math'

const either = logicOr(true, false) // true

// call it again after the values change
logicOr(false, 0, '') // false
```

Arguments are plain read-only values (upstream takes `MaybeRefOrGetter<any>[]`). The result is
re-evaluated on every call — there is no reactivity, so re-renders drive re-evaluation.

## Type Declarations

```ts
/**
 * Map from @vueuse/math `logicOr`
 * (`source/vueuse/packages/math/logicOr/`).
 *
 * @see https://vueuse.org/math/logicOr/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * logicOr(true, false) // true
 * logicOr(false, 0, '') // false
 *
 * @param args - Values to evaluate.
 * @returns `true` if any argument is truthy, `false` otherwise.
 */
export declare function logicOr(...args: any[]): boolean
```
