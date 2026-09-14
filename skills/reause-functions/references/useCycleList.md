---
category: Utilities
---

# useCycleList

Cycle through a list of items

## Usage

```ts
import { useCycleList } from '@reause/core'

const { state, next, prev, go } = useCycleList([
  'Dog',
  'Cat',
  'Lizard',
  'Shark',
  'Whale',
  'Dolphin',
  'Octopus',
  'Seal',
])

console.log(state) // 'Dog'

prev()

console.log(state) // 'Seal'

go(3)

console.log(state) // 'Shark'
```

## Source Forms

`list` is a read-only value source and takes a plain `T[]` (upstream:
`MaybeRefOrGetter<T[]>`). Resolve a React ref or state value at the call site:

```tsx
const [list, setList] = useState(['Dog', 'Cat'])

const { state, next } = useCycleList(list) // a new array is picked up on re-render
const { state: refState } = useCycleList(listRef.current) // resolve a React ref yourself
```

## Type Declarations

```ts
export interface UseCycleListOptions<T> {
  /**
   * The initial value of the state. A read-only value source — pass a plain value.
   */
  initialValue?: T
  /**
   * The default index when the current value is not found in the list.
   */
  fallbackIndex?: number
  /**
   * Custom function to get the index of the current value.
   */
  getIndexOf?: (value: T, list: T[]) => number
}
export interface UseCycleListReturn<T> {
  /** Current item. */
  state: T
  /** Index of the current item — `fallbackIndex` (default `0`) when `state` is not in `list`. */
  index: number
  /** Go to the next item (wraps around the end of the list). */
  next: (n?: number) => T
  /** Go to the previous item (wraps around the start of the list). */
  prev: (n?: number) => T
  /**
   * Go to a specific index.
   */
  go: (i: number) => T
  /**
   * Set the current item directly (value or updater form, like `setState`). React addition —
   * upstream assigns `state.value = v` on a Vue ref.
   */
  setState: Dispatch<SetStateAction<T>>
  /**
   * Set the current index directly (same as `go`, value or updater form). React addition — upstream
   * assigns `index.value = i` on a Vue computed ref.
   */
  setIndex: Dispatch<SetStateAction<number>>
}
/**
 * Map from @vueuse/core `useCycleList`
 * (`source/vueuse/packages/core/useCycleList/`).
 *
 * @example
 * const { state, next, prev, go } = useCycleList([
 *   'Dog', 'Cat', 'Lizard', 'Shark', 'Whale', 'Dolphin', 'Octopus', 'Seal',
 * ])
 *
 * state // 'Dog'
 * next() // 'Cat'
 * go(3) // 'Shark'
 */
export declare function useCycleList<T>(
  list: T[],
  options?: UseCycleListOptions<T>,
): UseCycleListReturn<T>
```
