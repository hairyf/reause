---
category: Array
---

# useArrayReduce

Reactive `Array.reduce`.

## Usage

```tsx
import { useArrayReduce } from '@reause/shared'

const sum = useArrayReduce([1, 2, 3], (sum, val) => sum + val) // 6
```

### Use with reactive array

```tsx
import { useArrayReduce } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState([1, 2])
const sum = useArrayReduce(list, (sum, val) => sum + val) // 3

setList([...list, 3])
// sum: 6 on the next render
```

### Use with initialValue

```tsx
import { useArrayReduce } from '@reause/shared'
import { useState } from 'react'

const [list, setList] = useState([{ num: 1 }, { num: 2 }])
const sum = useArrayReduce(list, (sum, val) => sum + val.num, 0) // 3

setList([...list, { num: 3 }])
// sum: 6 on the next render
```

`list` holds plain values only: pass a plain array (e.g. from `useState`), not an array of refs and not a getter — upstream's ref-element list input has no React equivalent here. Pass a new array to recompute on the next render.

## Type Declarations

```ts
export type UseArrayReducer<PV, CV, R> = (
  previousValue: PV,
  currentValue: CV,
  currentIndex: number,
) => R
export type UseArrayReduceReturn<T = any> = T
/**
 * Map from @vueuse/shared `useArrayReduce`.
 *
 * @see https://vueuse.org/shared/useArrayReduce/
 *
 * @example
 * const [list, setList] = useState([1, 2, 3])
 * useArrayReduce(list, (prev, item) => prev + item) // 6
 * setList([4, 2, 3]) // 9 on the next render
 *
 * @param list - the array was called upon.
 * @param reducer - a "reducer" function.
 *
 * @returns the value that results from running the "reducer" callback function to completion over the entire array.
 */
export declare function useArrayReduce<T>(
  list: readonly T[],
  reducer: UseArrayReducer<T, T, T>,
): UseArrayReduceReturn<T>
/**
 * Reactive `Array.reduce`
 *
 * @param list - the array was called upon.
 * @param reducer - a "reducer" function.
 * @param initialValue - a value (or a React lazy-initializer function, invoked
 * per evaluation like `useState`) to be initialized the first time when the callback is called.
 *
 * @returns the value that results from running the "reducer" callback function to completion over the entire array.
 */
export declare function useArrayReduce<T, U>(
  list: readonly T[],
  reducer: UseArrayReducer<U, T, U>,
  initialValue: U | (() => U),
): UseArrayReduceReturn<U>
```
