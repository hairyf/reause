import type { UseProjection } from '../createGenericProjection'
import type { ProjectorFunction } from '../useProjection'
import { createGenericProjection } from '../createGenericProjection'

function defaultNumericProjector(input: number, from: readonly [number, number], to: readonly [number, number]) {
  return (input - from[0]) / (from[1] - from[0]) * (to[1] - to[0]) + to[0]
}

/**
 * Map from @vueuse/math `createProjection`
 * Mapping: `ComputedRef<number>` → a plain projector function returning a plain `number`. React has
 * no reactive graph, so the returned projector recomputes the numeric projection on every call and
 * the caller drives re-renders; the domains are plain values (`MaybeRefOrGetter` is not supported)
 * — re-create the projector when a domain changes. Delegates to `createGenericProjection` with the
 * default numeric projector.
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const projector = createProjection([0, 10], [0, 100])
 * projector(5) // 50
 */
export function createProjection(
  fromDomain: readonly [number, number],
  toDomain: readonly [number, number],
  projector: ProjectorFunction<number, number> = defaultNumericProjector,
): UseProjection<number, number> {
  return createGenericProjection(fromDomain, toDomain, projector)
}
