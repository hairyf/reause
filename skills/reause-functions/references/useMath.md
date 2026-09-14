---
category: '@Math'
---

# useMath

Reactive `Math` methods.

## Usage

```tsx
import { useMath } from '@reause/math'
import { useState } from 'react'

const [base, setBase] = useState(2)
const [exponent, setExponent] = useState(3)
const result = useMath('pow', base, exponent) // 8

const [num, setNum] = useState(2)
const root = useMath('sqrt', num) // 1.4142135623730951

setNum(4) // triggers a re-render
// root === 2
```

Arguments are plain read-only numbers (upstream takes `MaybeRefOrGetter`):

```tsx
import { useMath } from '@reause/math'

const power = useMath('pow', 2, 3) // 8
const root = useMath('sqrt', 4) // 2
const rounded = useMath('round', 2.5) // 3
```

## Type Declarations

```ts
/** String keys of `Math` that are methods (callables), mirroring upstream's `UseMathKeys`. */
export type UseMathKeys = keyof {
  [
    K in keyof Math as Math[K] extends (...args: any) => any ? K : never
  ]: unknown
}
/**
 * Return type — `Math` methods always return a `number`. The arguments stay plain values (see
 * `PlainMathMethod`), not upstream's reactified ones.
 */
export type UseMathReturn<K extends keyof Math> = ReturnType<
  PlainMathMethod<Math[K]>
>
/**
 * Arguments of a plain function — a local copy of VueUse shared's `ArgumentsType` (reause has no
 * shared equivalent).
 */
type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never
/**
 * A `Math` method whose arguments stay plain values — deliberately NOT VueUse's `Reactified<T,
 * Computed>` (which wraps every argument in `MaybeRefOrGetter` and resolves getters via `toValue`).
 * Getters as data sources are rejected repo-wide (rule 1, issue #462); the reause hook reads the
 * plain arguments at render time and returns the computed `number` directly.
 */
type PlainMathMethod<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : never
/**
 * Map from @vueuse/math `useMath`
 * (`source/vueuse/packages/math/useMath/`).
 *
 * @see https://vueuse.org/math/useMath/
 *
 * @__NO_SIDE_EFFECTS__
 *
 * @example
 * const result = useMath('pow', 2, 3) // 8
 *
 * const power = useMath('pow', 2, 3) // 8
 *
 * const root = useMath('sqrt', 4) // 2
 *
 * const rounded = useMath('round', 2.5) // 3
 *
 * @param key - The `Math` method name to call (e.g. `'pow'`, `'sqrt'`).
 * @param args - Plain numeric arguments to pass to the `Math` method.
 * @returns The result of calling `Math[key]` with the arguments.
 */
export declare function useMath<K extends keyof Math>(
  key: K,
  ...args: ArgumentsType<PlainMathMethod<Math[K]>>
): UseMathReturn<K>
```
