---
category: Array
---

# useArrayUnique

reactive unique array

## Usage

### Use with array of multiple refs

```tsx
import { useArrayUnique } from '@reause/shared'
import { useState } from 'react'

const [item1, setItem1] = useState(0)
const [item2, setItem2] = useState(1)
const [item3, setItem3] = useState(1)
const [item4, setItem4] = useState(2)
const [item5, setItem5] = useState(3)
const list = [item1, item2, item3, item4, item5]
const result = useArrayUnique(list)
// result: [0, 1, 2, 3]

setItem5(1)
// result: [0, 1, 2] on the next render
```

### Use with reactive array

```tsx
import { useArrayUnique } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState([1, 2, 2, 3])
const result = useArrayUnique(list)
// result: [1, 2, 3]

setList([...list, 1])
// result: [1, 2, 3] on the next render
```

### Use with custom function

```tsx
import { useArrayUnique } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState([
  { id: 1, name: 'foo' },
  { id: 2, name: 'bar' },
  { id: 1, name: 'baz' },
])

const result = useArrayUnique(list, (a, b) => a.id === b.id)
// result: [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]

setList([...list, { id: 1, name: 'qux' }])
// result: [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
```

`list` holds plain values only: pass a plain array (e.g. from `useState`), not an array of refs and not a getter — upstream's ref-element and reactive-array inputs have no React equivalent here. Pass a new array to recompute on the next render.

## Type Declarations

```ts
export type UseArrayUniqueReturn<T = any> = T[]
/**
 * Map from @vueuse/shared `useArrayUnique`.
 *
 * @see https://vueuse.org/shared/useArrayUnique/
 *
 * @example
 * const [list, setList] = useState([0, 2, 2, 4, 4, 4])
 * const result = useArrayUnique(list) // [0, 2, 4]
 *
 * setList([0, 2, 4, 6, 6]) // result === [0, 2, 4, 6] on the next render
 */
export declare function useArrayUnique<T>(
  list: readonly T[],
  compareFn?: (a: T, b: T, array: readonly T[]) => boolean,
): UseArrayUniqueReturn<T>
```
