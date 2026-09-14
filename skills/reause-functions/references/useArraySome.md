---
category: Array
---

# useArraySome

Reactive `Array.some`

## Usage

### Use with array of multiple refs

```tsx
import { useArraySome } from '@reause/shared'
import { useState } from 'react'

const [item1, setItem1] = useState(0)
const [item2, setItem2] = useState(2)
const [item3, setItem3] = useState(4)
const [item4, setItem4] = useState(6)
const [item5, setItem5] = useState(8)
const list = [item1, item2, item3, item4, item5]
const result = useArraySome(list, i => i > 10) // false

setItem1(11)
// result: true on the next render
```

### Use with reactive array

```tsx
import { useArraySome } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState([0, 2, 4, 6, 8])
const result = useArraySome(list, i => i > 10) // false

setList([...list, 11])
// result: true on the next render
```

`list` holds plain values only: pass a plain array (e.g. from `useState`), not an array of refs and not a getter — upstream's ref-element and reactive-array inputs have no React equivalent here. Pass a new array to recompute on the next render.

## Type Declarations

```ts
export type UseArraySomeReturn = boolean
/**
 * Map from @vueuse/shared `useArraySome`.
 *
 * @see https://vueuse.org/shared/useArraySome/
 * @param list - the array was called upon.
 * @param fn - a function to test each element.
 *
 * @returns **true** if the `fn` function returns a **truthy** value for any element from the array. Otherwise, **false**.
 *
 * @example
 * const [list, setList] = useState([0, 2, 4, 6, 8])
 * const result = useArraySome(list, i => i > 10) // false
 * setList([...list, 11]) // result === true on the next render
 */
export declare function useArraySome<T>(
  list: readonly T[],
  fn: (element: T, index: number, array: readonly T[]) => unknown,
): UseArraySomeReturn
```
