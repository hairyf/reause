import type { FuseResult, IFuseOptions } from 'fuse.js'
import Fuse from 'fuse.js'
import { useMemo } from 'react'

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
export function useFuse<DataItem>(
  search: string,
  data: readonly DataItem[],
  options?: UseFuseOptions<DataItem>,
): UseFuseReturn<DataItem> {
  const dataValue = data
  const optionsValue = options

  const fuse = useMemo(
    () => new Fuse(dataValue, optionsValue?.fuseOptions),
    [dataValue, optionsValue?.fuseOptions],
  )

  const searchValue = search

  const results = useMemo(() => {
    // upstream: recomputed whenever `data` changes too, since a new `Fuse`
    // instance is a tracked dependency here
    if (optionsValue?.matchAllWhenSearchEmpty && !searchValue)
      return dataValue.map((item, index) => ({ item, refIndex: index }))

    const limit = optionsValue?.resultLimit
    return fuse.search(searchValue, (limit ? { limit } : undefined))
  }, [dataValue, fuse, optionsValue, searchValue])

  return {
    fuse,
    results,
  }
}
