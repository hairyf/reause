import type { ProjectorFunction } from '../useProjection'

/**
 * A projector built by `createGenericProjection`: takes the input value and returns the projected
 * value of type `T`.
 */
export type UseProjection<F, T> = (input: F) => T

/**
 * Map from @vueuse/math `createGenericProjection`
 * Mapping: `ComputedRef<T>` → a plain projector function returning a plain `T`. React has no
 * reactive graph, so the returned projector recomputes the projection on every call (nothing is
 * memoized) and the caller drives re-renders. Domains and input are plain values
 * (`MaybeRefOrGetter` is not supported) — re-create the projector when a domain changes.
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const projector = createGenericProjection(
 *   [0, 10],
 *   ['low', 'high'],
 *   (input, from, to) => (input > (from[0] + from[1]) / 2 ? to[1] : to[0]),
 * )
 * projector(8) // 'high'
 */
export function createGenericProjection<F = number, T = number>(
  fromDomain: readonly [F, F],
  toDomain: readonly [T, T],
  projector: ProjectorFunction<F, T>,
): UseProjection<F, T> {
  return (input: F) => projector(input, fromDomain, toDomain)
}
