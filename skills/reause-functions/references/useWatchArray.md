---
category: Watch
---

# useWatchArray

Watches an array value and reports which items were added and removed since the previous list

## Usage

```tsx
import { useWatchArray } from '@reause/shared'

useWatchArray(list, (newList, oldList, added, removed) => {
  console.log(`added: ${added}`, `removed: ${removed}`)
})

// fire once on mount with the current list
useWatchArray(list, (newList, oldList, added, removed) => {
  console.log(newList, oldList, added, removed)
}, { immediate: true })
```

## Type Declarations

```ts
export interface UseWatchArrayCallback<V = any, OV = any> {
  (value: V, oldValue: OV, added: V, removed: OV): void
}
export interface UseWatchArrayOptions<
  Immediate extends Readonly<boolean> = false,
> {
  /**
   * Fire the callback once on mount with the current list.
   * @default false
   */
  immediate?: Immediate
}
/**
 * React port of VueUse's `watchArray` — watch for an array with additions and removals.
 *
 * Mapping: built on the house `useWatch` — the list is a plain array value tracked across renders,
 * `useWatch` handles the change detection, and the previous list is diffed against the next one
 * with item-identity matching (like upstream) so the callback receives `(newList, oldList, added,
 * removed)`. The list is wrapped as a single-element watch source (`[list]`) so `useWatch` tracks
 * it by reference identity instead of spreading a variable-length list into its dependency list
 * (React requires a constant deps size).
 *
 * Divergences from the upstream Vue API:
 * - `source` is a plain array value — Vue's `WatchSource` forms (ref / getter / reactive)
 *   have no React equivalent, compute the array during render and pass it directly.
 * - The list is tracked by reference identity: replacing it with a new array fires the
 *   callback even when the items are identical (like a Vue ref reassignment), while
 *   re-renders that keep the same array reference do not fire.
 * - In-place mutations (`push` / `splice`) do not re-render — produce a new array
 *   (`setList([...list, item])`) to trigger the watch.
 * - The upstream `onCleanup` callback parameter is not ported — `useWatch` has no
 *   watch-cleanup equivalent, use `useEffect` cleanup in the component instead.
 * - The return value is `void` — upstream returns a stop `WatchHandle`; watching
 *   ends when the component unmounts.
 *
 * @example
 * ```ts
 * useWatchArray(list, (newList, oldList, added, removed) => {
 *   console.log('added:', added, 'removed:', removed)
 * })
 * ```
 */
export declare function useWatchArray<
  T,
  Immediate extends Readonly<boolean> = false,
>(
  source: T[],
  cb: UseWatchArrayCallback<
    T[],
    Immediate extends true ? T[] | undefined : T[]
  >,
  options?: UseWatchArrayOptions<Immediate>,
): void
```
