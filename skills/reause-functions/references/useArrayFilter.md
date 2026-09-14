---
category: Array
---

# useArrayFilter

Reactive `Array.filter`

## Usage

### Use with array of multiple refs

```tsx
import { useArrayFilter } from '@reause/shared'
import { useState } from 'react'

const [item1, setItem1] = useState(0)
const [item2, setItem2] = useState(2)
const [item3, setItem3] = useState(4)
const [item4, setItem4] = useState(6)
const [item5, setItem5] = useState(8)
const list = [item1, item2, item3, item4, item5]
const result = useArrayFilter(list, i => i % 2 === 0)
// result: [0, 2, 4, 6, 8]

setItem2(1)
// result: [0, 4, 6, 8] on the next render
```

### Use with reactive array

```tsx
import { useArrayFilter } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
const result = useArrayFilter(list, i => i % 2 === 0)
// result: [0, 2, 4, 6, 8]

setList(list.slice(1))
// result: [2, 4, 6, 8] on the next render
```

`list` is a plain read-only array of plain elements: pass the array directly
(e.g. from `useState`), or `ref.current` if you keep it in a ref. The filtered
result recomputes on the render that passes a new array.

## Type Declarations

```ts
export type UseArrayFilterReturn<T = any> = T[]
/**
 * Map from @vueuse/shared `useArrayFilter`.
 *
 * @see https://vueuse.org/useArrayFilter
 *
 * @example
 * const [list, setList] = useState([0, 1, 2, 3, 4])
 * const evens = useArrayFilter(list, i => i % 2 === 0) // [0, 2, 4]
 * setList([1, 2, 3]) // evens === [2] on the next render
 */
export declare function useArrayFilter<T, S extends T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => element is S,
): UseArrayFilterReturn<S>
export declare function useArrayFilter<T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => unknown,
): UseArrayFilterReturn<T>
```
