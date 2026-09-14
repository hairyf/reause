---
category: Array
---

# useArrayJoin

Reactive `Array.join`

## Usage

### Use with array of multiple refs

```tsx
import { useArrayJoin } from '@reause/shared'
import { useState } from 'react'

const [item1, setItem1] = useState('foo')
const [item2, setItem2] = useState(0)
const [item3, setItem3] = useState({ prop: 'val' })
const list = [item1, item2, item3]
const result = useArrayJoin(list)
// result: foo,0,[object Object]

setItem1('bar')
// result: bar,0,[object Object] on the next render
```

### Use with reactive array

```tsx
import { useArrayJoin } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState(['string', 0, { prop: 'val' }, false, [1], [[2]], null, undefined, []])
const result = useArrayJoin(list)
// result: string,0,[object Object],false,1,2,,,

setList([...list, true])
// result: string,0,[object Object],false,1,2,,,,true on the next render

setList([null, 'string', undefined])
// result: ,string, on the next render
```

### Use with reactive separator

```tsx
import { useArrayJoin } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState(['string', 0, { prop: 'val' }])
const [separator, setSeparator] = useState('')
const result = useArrayJoin(list, separator)
// result: string,0,[object Object]

setSeparator('')
// result: string0[object Object] on the next render

setSeparator('--')
// result: string--0--[object Object] on the next render
```

`list` holds plain values only: the elements are joined with
`Array.prototype.join` (no per-element unwrap — a function element would be
stringified to its source instead of invoked). Pass the array directly (e.g.
from `useState`); the result recomputes on the render that passes a new array.

## Type Declarations

```ts
export type UseArrayJoinReturn = string
/**
 * Map from @vueuse/shared `useArrayJoin`.
 *
 * @example
 * const [list, setList] = useState(['foo', 0, { prop: 'val' }])
 * useArrayJoin(list) // 'foo,0,[object Object]'
 * useArrayJoin(list, '--') // 'foo--0--[object Object]'
 *
 * setList([...list, 'bar']) // result === 'foo--0--[object Object]--bar' on the next render
 *
 * @param list - the array was called upon.
 * @param separator - a string to separate each pair of adjacent elements of the array. If omitted, the array elements are separated with a comma (",").
 *
 * @returns a string with all array elements joined. If `list.length` is 0, the empty string is returned.
 */
export declare function useArrayJoin(
  list: any[],
  separator?: string,
): UseArrayJoinReturn
```
