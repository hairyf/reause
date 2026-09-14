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
 * Map from @vueuse/shared `isDefined`.
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
