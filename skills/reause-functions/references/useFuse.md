---
category: '@Integrations'
---

# useFuse

Easily implement fuzzy search using a hook with [Fuse.js](https://github.com/krisk/fuse).

From the Fuse.js website:

> What is fuzzy searching?
>
> Generally speaking, fuzzy searching (more formally known as approximate string matching) is the technique of finding strings that are approximately equal to a given pattern (rather than exactly).

## Install Fuse.js as a peer dependency

### NPM

```bash
npm install fuse.js@^7
```

### Yarn

```bash
yarn add fuse.js
```

## Usage

```tsx
import { useFuse } from '@reause/integrations'
import { useState } from 'react'

const data = [
  'John Smith',
  'John Doe',
  'Jane Doe',
  'Phillip Green',
  'Peter Brown',
]

const [input, setInput] = useState('Jhon D')

const { results } = useFuse(input, data)

/*
 * Results:
 *
 * { "item": "John Doe", "refIndex": 1 }
 * { "item": "John Smith", "refIndex": 0 }
 * { "item": "Jane Doe", "refIndex": 2 }
 *
 */
```

### Value sources

`search` and `data` are the hook's **read-only value sources** and take plain values (`string` and
`readonly DataItem[]`; upstream: `MaybeRefOrGetter`). A changed `search`/`data` prop recomputes on the
next render:

```tsx
const [search, setSearch] = useState('Jhon D')
const { results } = useFuse(search, data) // setSearch('Peter') recomputes on the next render
```

`options` is a plain config object (a format/config knob, not a value source).

Mutating the `data` array in place is not detected (upstream's deep watcher was) — pass a new array
reference when the collection changes.

Options are passed through `fuseOptions`, plus `resultLimit` and `matchAllWhenSearchEmpty`:

```tsx
import { useFuse } from '@reause/integrations'
import { useMemo, useState } from 'react'

const [search, setSearch] = useState('')

// memoized so the Fuse index is not rebuilt on every render
const options = useMemo(() => ({
  fuseOptions: { keys: ['firstName', 'lastName'] },
  resultLimit: 10,
  matchAllWhenSearchEmpty: true,
}), [])

const { fuse, results } = useFuse(search, data, options)

fuse.search('john') // search the same index directly
```

## Type Declarations

```ts
/**
 * Options passed straight through to the underlying `Fuse` instance — alias of fuse.js'
 * `IFuseOptions<T>`.
 */
export type FuseOptions<T> = IFuseOptions<T>
export interface UseFuseOptions<T> {
  /**
   * Options for the underlying `Fuse` instance.
   *
   * Memoize this object (and the `keys` array inside it) between renders: the `Fuse` index is
   * rebuilt whenever this reference changes. A fresh object literal on every render is still
   * CORRECT, only slower.
   */
  fuseOptions?: FuseOptions<T>
  /**
   * Maximum number of results returned by a search. Ignored when `matchAllWhenSearchEmpty` kicks in
   * for an empty search.
   */
  resultLimit?: number
  /**
   * Return every item (in its original order) while the search is empty, instead of an empty result
   * list.
   */
  matchAllWhenSearchEmpty?: boolean
}
/**
 * React return type: a plain object, not a tuple — `fuse` and `results` are named, heterogeneous
 * values (`fuse` is the live `Fuse` instance, `results` is a plain array), matching the
 * object-return precedent of `packages/core/src/useBattery.ts` and
 * `packages/core/src/useClipboard.ts`.
 */
export interface UseFuseReturn<DataItem> {
  /** The live `Fuse` instance — call `fuse.setCollection()` / `fuse.search()` on it directly. */
  fuse: Fuse<DataItem>
  /** Fuzzy search results, recomputed on every render. */
  results: FuseResult<DataItem>[]
}
/**
 * Map from @vueuse/integrations `useFuse`
 * (`source/vueuse/packages/integrations/useFuse/`).
 *
 * @param search - the search query
 * @param data - the collection to search
 * @param options - `fuseOptions` (forwarded to `new Fuse()`), `resultLimit`,
 *   `matchAllWhenSearchEmpty`
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const { fuse, results } = useFuse(input, data, {
 *   fuseOptions: { keys: ['firstName', 'lastName'] },
 *   resultLimit: 10,
 *   matchAllWhenSearchEmpty: true,
 * })
 * results[0].item // the best match
 * fuse.search('john') // search the same index directly
 */
export declare function useFuse<DataItem>(
  search: string,
  data: readonly DataItem[],
  options?: UseFuseOptions<DataItem>,
): UseFuseReturn<DataItem>
```
