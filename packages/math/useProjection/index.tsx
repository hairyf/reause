import { createProjection } from '../createProjection'

/**
 * Projection function type — `ProjectorFunction<F, T>` maps an input from the source domain to the
 * target domain.
 */
export type ProjectorFunction<F, T> = (input: F, from: readonly [F, F], to: readonly [T, T]) => T

/**
 * Map from @vueuse/math `useProjection`
 * Mapping: `ComputedRef<number>` → plain number recomputed from the current value on every render;
 * pure derived value — no reactive `.value`, the caller drives re-renders.
 *
 * React divergence: `input`, `fromDomain` and `toDomain` are all plain read-only values, not
 * upstream's `MaybeRefOrGetter<...>`. In particular the getter form (`() => number`) is NOT
 * accepted — getters as data sources are rejected repo-wide (issue #462). The caller re-renders
 * with new values (e.g. from `useState`) and the hook recomputes. Like upstream, the projection is
 * delegated to `createProjection` (its default projector is the linear numeric projector), so the
 * projector function is not duplicated here.
 *
 * @param input - The input value to project.
 * @param fromDomain - The source domain (a plain `readonly [number, number]`).
 * @param toDomain - The target domain (a plain `readonly [number, number]`).
 * @param projector - The projector function (defaults to the linear numeric projector).
 * @returns The projected number.
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const projected = useProjection(5, [0, 10], [0, 100]) // 50
 */
export function useProjection(
  input: number,
  fromDomain: readonly [number, number],
  toDomain: readonly [number, number],
  projector?: ProjectorFunction<number, number>,
): number {
  return createProjection(fromDomain, toDomain, projector)(input)
}
