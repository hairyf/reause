import { createProjection } from '../createProjection'

/**
 * Projection function type — `ProjectorFunction<F, T>` maps an input from the source domain to the
 * target domain.
 */
export type ProjectorFunction<F, T> = (input: F, from: readonly [F, F], to: readonly [T, T]) => T

/**
 * Map from @vueuse/math `useProjection`.
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
