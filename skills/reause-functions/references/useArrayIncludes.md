---
category: Array
---

# useArrayIncludes

Reactive `Array.includes`

## Usage

```tsx
import { useArrayIncludes } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState([0, 2, 4])
const includes = useArrayIncludes(list, 2) // true

setList([0, 1, 4]) // includes === false on the next render

const objects = [{ id: 1 }, { id: 2 }]
useArrayIncludes(objects, 2, 'id') // true — compare by key
useArrayIncludes(objects, { id: 2 }, (element, value) => element.id === value.id) // true — comparator function
useArrayIncludes(objects, { id: 1 }, { fromIndex: 1, comparator: (element, value) => element.id === value.id }) // false
```

### Use with reactive array

```tsx
import { useArrayIncludes } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState([0, 2, 4, 6, 8])
const result = useArrayIncludes(list, 10) // false

setList([...list, 10])
// result: true on the next render

setList(list.slice(0, -1))
// result: false on the next render
```

The `list` and `value` arguments are plain read-only values: pass the array/value
directly (e.g. from `useState`), or `ref.current` if you keep them in a ref. The
result recomputes on the render that passes a new value.

## Type Declarations

```ts
export type UseArrayIncludesComparatorFn<T, V> = (
  element: T,
  value: V,
  index: number,
  array: readonly T[],
) => boolean
export interface UseArrayIncludesOptions<T, V> {
  fromIndex?: number
  comparator?: UseArrayIncludesComparatorFn<T, V> | keyof T
}
export type UseArrayIncludesReturn = boolean
/**
 * Map from @vueuse/shared `useArrayIncludes`.
 *
 * @see https://vueuse.org/shared/useArrayIncludes/
 *
 * @example
 * const list = [0, 2, 4]
 * useArrayIncludes(list, 2) // true
 * useArrayIncludes(list, 8) // false
 * useArrayIncludes([{ id: 1 }, { id: 2 }], 2, 'id') // true
 * useArrayIncludes(list, 0, { fromIndex: 1, comparator: (a, b) => a === b }) // false
 *
 * @param list - the array was called upon.
 * @param value - the value to search for.
 * @param comparator - a function to compare elements with, a key of the elements to compare by, or an options object with `fromIndex` and `comparator`.
 *
 * @returns **true** if the `value` is found in the array. Otherwise, **false**.
 */
export declare function useArrayIncludes<T, V = any>(
  list: readonly T[],
  value: V,
  comparator?: UseArrayIncludesComparatorFn<T, V>,
): UseArrayIncludesReturn
export declare function useArrayIncludes<T, V = any>(
  list: readonly T[],
  value: V,
  comparator?: keyof T,
): UseArrayIncludesReturn
export declare function useArrayIncludes<T, V = any>(
  list: readonly T[],
  value: V,
  options?: UseArrayIncludesOptions<T, V>,
): UseArrayIncludesReturn
```
