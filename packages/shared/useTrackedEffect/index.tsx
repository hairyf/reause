import type { DependencyList } from 'react'
import { useEffect, useRef } from 'react'

type Effect<T extends DependencyList> = (
  changes?: number[],
  previousDeps?: T,
  currentDeps?: T,
) => void | (() => void)

/**
 * The index list of the elements that differ between two dependency lists, by reference equality
 * (`Object.is`). Iterates `previousDeps` only.
 */
function diffTwoDeps(previousDeps?: DependencyList, nextDeps?: DependencyList): number[] {
  return previousDeps
    ? previousDeps
        .map((_, index) => (!Object.is(previousDeps[index], nextDeps?.[index]) ? index : -1))
        .filter(index => index >= 0)
    : nextDeps
      ? nextDeps.map((_, index) => index)
      : []
}

/**
 * Map from ahooks `useTrackedEffect`
 * (`source/ahooks/packages/hooks/src/useTrackedEffect/`).
 *
 * @example
 * useTrackedEffect((changes) => {
 *   if (changes?.includes(0)) refetchA()
 *   if (changes?.includes(1)) refetchB()
 * }, [a, b])
 */
export function useTrackedEffect<T extends DependencyList>(effect: Effect<T>, deps?: [...T]): void {
  const previousDepsRef = useRef<T>(undefined)

  useEffect(() => {
    const changes = diffTwoDeps(previousDepsRef.current, deps)
    const previousDeps = previousDepsRef.current
    previousDepsRef.current = deps
    return effect(changes, previousDeps, deps)
  }, deps)
}
