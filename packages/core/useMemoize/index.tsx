import { useMemo, useRef } from 'react'

type CacheKey = any

/**
 * Custom memoize cache handler
 */
export interface UseMemoizeCache<Key, Value> {
  /**
   * Get value for key
   */
  get: (key: Key) => Value | undefined
  /**
   * Set value for key
   */
  set: (key: Key, value: Value) => void
  /**
   * Return flag if key exists
   */
  has: (key: Key) => boolean
  /**
   * Delete value for key
   */
  delete: (key: Key) => void
  /**
   * Clear cache
   */
  clear: () => void
}

/**
 * Memoized function
 */
export interface UseMemoizeReturn<Result, Args extends unknown[]> {
  /**
   * Get result from cache or call memoized function
   */
  (...args: Args): Result
  /**
   * Call memoized function and update cache
   */
  load: (...args: Args) => Result
  /**
   * Delete cache of given arguments
   */
  delete: (...args: Args) => void
  /**
   * Clear cache
   */
  clear: () => void
  /**
   * Generate cache key for given arguments
   */
  generateKey: (...args: Args) => CacheKey
  /**
   * Cache container
   */
  cache: UseMemoizeCache<CacheKey, Result>
}

export interface UseMemoizeOptions<Result, Args extends unknown[]> {
  getKey?: (...args: Args) => string | number
  cache?: UseMemoizeCache<CacheKey, Result>
}

/**
 * Map from @vueuse/core `useMemoize`
 * (`source/vueuse/packages/core/useMemoize/`).
 *
 * @example
 * const getUser = useMemoize(async (userId: number) => axios.get(`users/${userId}`).then(({ data }) => data))
 * await getUser(1) // request users/1
 * await getUser(1) // retrieved from cache
 * await getUser.load(1) // force re-fetch
 * getUser.delete(1) // delete cache for user 1
 * getUser.clear() // clear the full cache
 */
export function useMemoize<Result, Args extends unknown[]>(
  resolver: (...args: Args) => Result,
  options?: UseMemoizeOptions<Result, Args>,
): UseMemoizeReturn<Result, Args> {
  // keep the latest resolver / options in refs so the memoized function
  // stays referentially stable across renders but still sees fresh values
  const resolverRef = useRef(resolver)
  resolverRef.current = resolver
  const optionsRef = useRef(options)
  optionsRef.current = options

  // build the memoized function + cache once — upstream creates them once
  // per setup call, `useMemo` gives the same stability in React
  const memoized = useMemo<UseMemoizeReturn<Result, Args>>(() => {
    // The cache container is resolved once at build time (upstream closes
    // over the setup-time options object): `options.cache` is stateful, so
    // re-pointing it on a later render is intentionally ignored — swapping
    // the container mid-flight would discard cached data. `getKey` below, by
    // contrast, is stateless and is read fresh from the latest options on
    // every call.
    const initCache = (): UseMemoizeCache<CacheKey, Result> => {
      if (optionsRef.current?.cache)
        return optionsRef.current.cache
      return new Map<CacheKey, Result>()
    }
    const cache = initCache()

    /**
     * Generate key from args
     */
    const generateKey = (...args: Args) => optionsRef.current?.getKey
      ? optionsRef.current.getKey(...args)
      // Default key: Serialize args
      : JSON.stringify(args)

    /**
     * Load data and save in cache
     */
    const _loadData = (key: string | number, ...args: Args): Result => {
      cache.set(key, resolverRef.current(...args))
      return cache.get(key) as Result
    }
    const loadData = (...args: Args): Result => _loadData(generateKey(...args), ...args)

    /**
     * Delete key from cache
     */
    const deleteData = (...args: Args): void => {
      cache.delete(generateKey(...args))
    }

    /**
     * Clear cached data
     */
    const clearData = () => {
      cache.clear()
    }

    const memoized: Partial<UseMemoizeReturn<Result, Args>> = (...args: Args): Result => {
      // Get data from cache
      const key = generateKey(...args)
      if (cache.has(key))
        return cache.get(key) as Result
      return _loadData(key, ...args)
    }
    memoized.load = loadData
    memoized.delete = deleteData
    memoized.clear = clearData
    memoized.generateKey = generateKey
    memoized.cache = cache

    return memoized as UseMemoizeReturn<Result, Args>
  }, [])

  return memoized
}
