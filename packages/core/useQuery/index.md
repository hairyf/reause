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
