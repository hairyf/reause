---
category: Browser
---

# useQuery

Shorthand for a reactive query parameter in `window.location.search`. Updates the URL query parameters when the value changes.

## Usage

```tsx
import { useQuery } from '@reause/core'

const [search, setSearch] = useQuery('search')

const [search, setSearch] = useQuery('search', 'foo') // or with a default value

const [page, setPage] = useQuery('page', '1', { transform: Number }) // or transforming value

console.log(search) // window.location.search's `search` param
setSearch('foobar') // history.replaceState({ query: { search: 'foobar' } })
```

### Navigation Mode

By default, changes use `history.replaceState()`. Set `mode: 'push'` to use `history.pushState()` instead.

```tsx
import { useQuery } from '@reause/core'
// ---cut---
const [search, setSearch] = useQuery('search', '', { mode: 'push' })
```

### Bidirectional Transform

You can provide separate `get` and `set` transforms for reading and writing values.

```tsx
import { useQuery } from '@reause/core'
// ---cut---
const [filters, setFilters] = useQuery('filters', [], {
  transform: {
    get: v => v ? v.split(',') : [],
    set: v => v.join(','),
  },
})

// Reading: 'a,b,c' -> ['a', 'b', 'c']
// Writing: ['a', 'b', 'c'] -> 'a,b,c'
```

### Default Value Behavior

When the value equals the default value, the query parameter is removed from the URL.

```tsx
import { useQuery } from '@reause/core'
// ---cut---
const [page, setPage] = useQuery('page', '1')

setPage('2') // URL: ?page=2
setPage('1') // URL: (no page param, since it equals default)
```

## React divergences from upstream

- No router dependency: upstream proxies `route.query` through vue-router; this hook reads and writes `window.location.search` / `history` directly, so it needs no routing library.
- Returns the React array tuple `[value, setValue]` (upstream returns a single writable Vue ref).
- Upstream batches multi-key writes per tick through a queue and pushes one router navigation; here each `setValue` performs its own history update immediately.
- There is no multi-page router context: the hook is scoped to the current `window.location` only.

## Type Declarations

```ts
export type RouteQueryValueRaw =
  string | number | boolean | null | (string | number | boolean | null)[]
export interface UseQueryOptions<T, K> {
  /**
   * How a new query is written into the browser history.
   *
   * - `'replace'`: `history.replaceState` — overwrites the current history
   *   entry.
   * - `'push'`: `history.pushState` — adds a new entry, so the browser's back
   *   button returns to the previous query.
   *
   * @default 'replace'
   */
  mode?: "replace" | "push"
  /**
   * Function to transform data before return, or an object with one or both functions: `get` to
   * transform data before returning, and `set` to transform data before setting.
   */
  transform?:
    | ((value: T) => K)
    | {
        get?: (value: T) => K
        set?: (value: K) => T
      }
}
export declare function useQuery(
  name: string,
): [
  undefined | null | string | string[],
  (value: undefined | null | string | string[]) => void,
]
export declare function useQuery<T extends RouteQueryValueRaw = string, K = T>(
  name: string,
  defaultValue?: T,
  options?: UseQueryOptions<T, K>,
): [K, (value: K) => void]
```
