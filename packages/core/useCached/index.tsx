import { useRef } from 'react'

/**
 * Comparator deciding whether a new source value is significant enough to replace the cached value.
 *
 * Upstream signature — `(newSourceValue, cachedValue) => boolean`. When it returns `true`, the
 * cache is kept as-is; when it returns `false`, the cache is updated to the new source value.
 */
export type UseCachedComparator<T> = (newSourceValue: T, cachedValue: T) => boolean

/**
 * Map from @vueuse/core `useCached`
 * (`source/vueuse/packages/core/useCached/`).
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const [source, setSource] = useState({ value: 42, extra: 0 })
 * const cached = useCached(source, (newSourceValue, cachedValue) => newSourceValue.value === cachedValue.value)
 *
 * setSource({ value: 42, extra: 1 })
 * cached // { value: 42, extra: 0 } — only `value` is significant
 *
 * setSource({ value: 43, extra: 1 })
 * cached // { value: 43, extra: 1 } — significant change, cache follows
 */
export function useCached<T>(
  source: T,
  comparator: UseCachedComparator<T> = (newSourceValue, cachedValue) => newSourceValue === cachedValue,
): T {
  const sourceValue = source

  // derived state during render — the first render seeds the cache and the
  // previous-source ref, then a render adopts the new source only when the
  // resolved source value changed and the comparator deems the change
  // significant (upstream: the `watch` callback)
  const cachedRef = useRef<T>(sourceValue)
  const previousSourceRef = useRef<T>(sourceValue)

  if (!Object.is(sourceValue, previousSourceRef.current)) {
    previousSourceRef.current = sourceValue
    if (!comparator(sourceValue, cachedRef.current))
      cachedRef.current = sourceValue
  }

  return cachedRef.current
}
