---
category: Array
---

# useArrayMap

Reactive `Array.map`

## Usage

### Use with array of multiple refs

```tsx
import { useArrayMap } from '@reause/shared'
import { useState } from 'react'

const [item1, setItem1] = useState(0)
const [item2, setItem2] = useState(2)
const [item3, setItem3] = useState(4)
const [item4, setItem4] = useState(6)
const [item5, setItem5] = useState(8)
const list = [item1, item2, item3, item4, item5]
const result = useArrayMap(list, i => i * 2)
// result: [0, 4, 8, 12, 16]

setItem1(1)
// result: [2, 4, 8, 12, 16] on the next render
```

### Use with reactive array

```tsx
import { useArrayMap } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState([0, 1, 2, 3, 4])
const result = useArrayMap(list, i => i * 2)
// result: [0, 2, 4, 6, 8]

setList(list.slice(0, -1))
// result: [0, 2, 4, 6] on the next render
```

`list` is a plain read-only array: pass the array directly (e.g. from
`useState`), or `ref.current` if you keep it in a ref. The result recomputes on
the render that passes a new array.

## Type Declarations

```ts
export type UseArrayMapReturn<T = any> = T[]
/**
 * Map from @vueuse/shared `useArrayMap`.
 *
 * @example
 * const [list, setList] = useState([0, 1, 2, 3, 4])
 * const result = useArrayMap(list, i => i * 2) // [0, 2, 4, 6, 8]
 * setList(list.slice(0, -1)) // result: [0, 2, 4, 6] on the next render
 */
export declare function useArrayMap<T, U = T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => U,
): UseArrayMapReturn<U>
```
