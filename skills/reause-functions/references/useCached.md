---
category: Utilities
---

# useCached

Cache a value with a custom comparator

## Usage

```tsx
import { useCached } from '@reause/core'
import { useState } from 'react'

interface Data {
  value: number
  extra: number
}

const [source, setSource] = useState<Data>({ value: 42, extra: 0 })
const cached = useCached(source, (newSourceValue, cachedValue) => newSourceValue.value === cachedValue.value)

setSource({ value: 42, extra: 1 })
console.log(cached) // { value: 42, extra: 0 } — only `value` is significant

setSource({ value: 43, extra: 1 })
console.log(cached) // { value: 43, extra: 1 } — significant change, cache follows
```

## Type Declarations

```ts
/**
 * Comparator deciding whether a new source value is significant enough to replace the cached value.
 *
 * Upstream signature — `(newSourceValue, cachedValue) => boolean`. When it returns `true`, the
 * cache is kept as-is; when it returns `false`, the cache is updated to the new source value.
 */
export type UseCachedComparator<T> = (
  newSourceValue: T,
  cachedValue: T,
) => boolean
/**
 * Map from @vueuse/core `useCached`
 * (`source/vueuse/packages/core/useCached/`).
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const [source, setSource] = useState({ value: 42, extra: 0 })
 * const cached = useCached(source, (newSourceValue, cachedValue) => newSourceValue.value === cachedValue.value)
 *
 * setSource({ value: 42, extra: 1 })
 * cached // { value: 42, extra: 0 } — only `value` is significant
 *
 * setSource({ value: 43, extra: 1 })
 * cached // { value: 43, extra: 1 } — significant change, cache follows
 */
export declare function useCached<T>(
  source: T,
  comparator?: UseCachedComparator<T>,
): T
```
