---
category: Utilities
---

# useOffsetPagination

Reactive offset pagination

## Usage

```tsx
import { useOffsetPagination } from '@reause/core'

function fetchData({ currentPage, currentPageSize }: { currentPage: number, currentPageSize: number }) {
  fetch(currentPage, currentPageSize).then((responseData) => {
    setData(responseData)
  })
}

const {
  currentPage,
  setCurrentPage,
  currentPageSize,
  setCurrentPageSize,
  pageCount,
  isFirstPage,
  isLastPage,
  prev,
  next,
} = useOffsetPagination({
  total: database.length,
  page: 1,
  pageSize: 10,
  onPageChange: ({ currentPage, currentPageSize }) => fetchData(currentPage, currentPageSize),
  onPageSizeChange: ({ currentPage, currentPageSize }) => fetchData(currentPage, currentPageSize),
})
// note: currentPage/currentPageSize/pageCount are plain numbers — navigate with
// prev/next (or setCurrentPage/setCurrentPageSize)
```

## Source Forms

`total` and `pageSize` are read-only value sources and take plain numbers — only their initial value is adopted. `page` is controllable (the hook
writes it back), so it accepts a React `State<number>`:

```tsx
const [page, setPage] = useState(1)

const pagination = useOffsetPagination({
  total: 40, // plain number
  pageSize: 10, // plain number
  page, // state value — external updates are adopted, navigation writes back
})
```

`page` also accepts a getter, a React ref (`{ current }`), a `[value, setter]` tuple or a
`{ value, onChange }` pair. A reactive `page` is kept in two-way sync with the internal state
(upstream's `syncRef`); the tuple and `{ value, onChange }` forms are the React state protocol and
have no upstream equivalent.

## Return Values

The return is an object mirroring upstream's `UseOffsetPaginationReturn`, with every writable value
paired with its setter — upstream returns writable refs, so consumers write `currentPage.value` /
`currentPageSize.value`:

| Property             | Type                               | Description                                                                                                 |
| -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `currentPage`        | `number`                           | Current page number, clamped to `[1, pageCount]`.                                                           |
| `setCurrentPage`     | `Dispatch<SetStateAction<number>>` | Sets `currentPage` (value or updater), clamped to `[1, pageCount]` (upstream: writing `currentPage.value`). |
| `currentPageSize`    | `number`                           | Current number of items displayed per page, clamped to `>= 1`.                                              |
| `setCurrentPageSize` | `Dispatch<SetStateAction<number>>` | Sets `currentPageSize` (value or updater), clamped to `>= 1` (upstream: writing `currentPageSize.value`).   |
| `pageCount`          | `number`                           | Total number of pages.                                                                                      |
| `isFirstPage`        | `boolean`                          | Whether the current page is the first one.                                                                  |
| `isLastPage`         | `boolean`                          | Whether the current page is the last one.                                                                   |
| `prev`               | `() => void`                       | Go to the previous page (no-op on the first page).                                                          |
| `next`               | `() => void`                       | Go to the next page (no-op on the last page).                                                               |

When `total` is omitted, `isLastPage` is not returned (`UseOffsetPaginationInfinityPageReturn`).

## Type Declarations

```ts
export interface UseOffsetPaginationOptions {
  /**
   * Total number of items. A read-only value source — pass a plain number.
   */
  total?: number
  /**
   * The number of items to display per page. A read-only value source — pass a plain number. Only
   * the initial value is adopted; navigate with `setCurrentPageSize`.
   * @default 10
   */
  pageSize?: number
  /**
   * The current page number. Controllable — the hook writes it back, so it accepts a React
   * `State<number>`: a plain number, a getter, a `[value, setter]` state tuple or a `{ value,
   * onChange }` pair — resolved with `toValue`. A React ref is not a state source and is not
   * accepted.
   * @default 1
   */
  page?: State<number>
  /**
   * Callback when the `page` change.
   */
  onPageChange?: (returnValue: UseOffsetPaginationCallbackReturn) => unknown
  /**
   * Callback when the `pageSize` change.
   */
  onPageSizeChange?: (returnValue: UseOffsetPaginationCallbackReturn) => unknown
  /**
   * Callback when the `pageCount` change.
   */
  onPageCountChange?: (
    returnValue: UseOffsetPaginationCallbackReturn,
  ) => unknown
}
export interface UseOffsetPaginationReturn {
  /** Current page number, clamped to `[1, pageCount]`. */
  readonly currentPage: number
  /** Current number of items displayed per page, clamped to `>= 1`. */
  readonly currentPageSize: number
  /** Total number of pages. */
  readonly pageCount: number
  /** Whether the current page is the first one. */
  readonly isFirstPage: boolean
  /** Whether the current page is the last one. */
  readonly isLastPage: boolean
  /** Go to the previous page (no-op on the first page). */
  readonly prev: () => void
  /** Go to the next page (no-op on the last page). */
  readonly next: () => void
  /**
   * Set the current page directly, clamped to `[1, pageCount]` — the setter half of the writable
   * `currentPage`. React addition — upstream assigns `currentPage.value = n` on a Vue ref.
   */
  readonly setCurrentPage: Dispatch<SetStateAction<number>>
  /**
   * Set the current page size directly, clamped to `>= 1` — the setter half of the writable
   * `currentPageSize`. React addition — upstream assigns `currentPageSize.value = n` on a Vue ref.
   */
  readonly setCurrentPageSize: Dispatch<SetStateAction<number>>
}
/**
 * Snapshot passed to the `onPageChange` / `onPageSizeChange` / `onPageCountChange` callbacks — the
 * upstream members only, without the setters.
 */
export type UseOffsetPaginationCallbackReturn = Omit<
  UseOffsetPaginationReturn,
  "setCurrentPage" | "setCurrentPageSize"
>
export type UseOffsetPaginationInfinityPageReturn = Omit<
  UseOffsetPaginationReturn,
  "isLastPage"
>
/**
 * Map from @vueuse/core `useOffsetPagination`
 * (`source/vueuse/packages/core/useOffsetPagination/`).
 *
 * @example
 * const {
 *   currentPage,
 *   setCurrentPage,
 *   currentPageSize,
 *   setCurrentPageSize,
 *   pageCount,
 *   isFirstPage,
 *   isLastPage,
 *   prev,
 *   next,
 * } = useOffsetPagination({
 *   total: 40,
 *   page: 1,
 *   pageSize: 10,
 *   onPageChange: ({ currentPage, currentPageSize }) => fetchData(currentPage, currentPageSize),
 * })
 */
export declare function useOffsetPagination(
  options: Omit<UseOffsetPaginationOptions, "total">,
): UseOffsetPaginationInfinityPageReturn
export declare function useOffsetPagination(
  options: UseOffsetPaginationOptions,
): UseOffsetPaginationReturn
```
