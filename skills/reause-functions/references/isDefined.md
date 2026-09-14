---
category: Utilities
---

# isDefined

Non-nullish checking type guard for React ref objects and plain values

## Usage

```tsx
import { isDefined } from '@reause/shared'
import { useRef } from 'react'

const example = useRef(Math.random() ? 'example' : undefined) // RefObject<string | undefined>

if (isDefined(example))
  example.current // string — narrowed by the type guard
```

## Type Declarations

```ts
export type IsDefinedReturn = boolean
/**
 * Non-nullish checking type guard for ref-like objects.
 *
 * Map from @vueuse/shared `isDefined`
 * Mapping: upstream narrows a Vue `Ref` / `ComputedRef` itself; this port
 * operates on React ref-like objects (`{ current }`) and narrows `.current`
 * to `Exclude<T, null | undefined>` — upstream's `Ref` and `ComputedRef`
 * overloads collapse into the single ref-like overload below. The
 * plain-value overload keeps upstream parity at the type level, so bare
 * values can be guarded with the same call. At runtime a ref-like is
 * detected via `isRefLike` (mirroring upstream's `unref`), so both shapes
 * share one check — with one edge: a plain object that happens to look like
 * a ref (`{ current: undefined }`) is unwrapped and judged by `.current`
 * (upstream `unref` only unwraps Vue refs, so the same object would be
 * `true` there).
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const example = useRef(Math.random() ? 'example' : undefined) // RefObject<string | undefined>
 *
 * if (isDefined(example))
 *   example.current // string — narrowed by the type guard
 *
 * @see https://vueuse.org/shared/isDefined/
 */
export declare function isDefined<T>(
  v: RefObject<T>,
): v is RefObject<Exclude<T, null | undefined>>
export declare function isDefined<T>(v: T): v is Exclude<T, null | undefined>
```
