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
 * (`source/vueuse/packages/core/useCached/`). Caches a value with a custom
 * comparator: the returned value only moves when the comparator reports that the new source differs
 * significantly from it, otherwise the previous value is kept.
 *
 * React divergences: upstream wraps a `Ref` with a `watch` that copies the source into the cache
 * whenever the comparator returns `false` — a plain value cannot be watched, so the port derives
 * the cache from the props at render: one ref holds the cached value and another holds the
 * previously resolved source value. The comparator runs only when the resolved source value
 * actually changes (`Object.is`), mirroring the upstream `watch` trigger, and the mount seeds the
 * cache from the source without calling the comparator. Because the change check is ref-based
 * rather than render-based, unrelated re-renders — including React StrictMode's double mount render
 * — do not re-run the comparator. The source is a plain value per the mapped API — a ref, getter or
 * `State<T>` is not accepted. A plain data object that happens to carry a `value` key (e.g. `{
 * value: 42, extra: 0 }`) is cached as-is and never unwrapped.
 *
 * Upstream `options` are intentionally not ported: `deepRefs` (shallow vs deep ref) has no React
 * analog because the port always stores and returns the plain value as-is, and `WatchOptions`
 * (`flush` / `immediate` / `deep` / `once`) configure the Vue `watch` that React has no equivalent
 * for.
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
