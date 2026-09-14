import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useRef, useState } from 'react'

export type UseStepperReturn<StepName, Steps, Step> = readonly [
  /** Index of the current step. */
  index: number,
  /**
   * Setter for the current step index — `setIndex(next)` or `setIndex(prev => next)`.
   */
  setIndex: Dispatch<SetStateAction<number>>,
  controls: {
    /** List of steps. */
    steps: Steps
    /** List of step names. */
    stepNames: StepName[]
    /** Current step. */
    current: Step
    /** Next step, or undefined if the current step is the last one. */
    next: StepName | undefined
    /** Previous step, or undefined if the current step is the first one. */
    previous: StepName | undefined
    /** Whether the current step is the first one. */
    isFirst: boolean
    /** Whether the current step is the last one. */
    isLast: boolean
    /** Get the step at the specified index. */
    at: (index: number) => Step | undefined
    /** Get a step by the specified name. */
    get: (step: StepName) => Step | undefined
    /** Go to the specified step. Does nothing if the step does not exist. */
    goTo: (step: StepName) => void
    /** Go to the next step. Does nothing if the current step is the last one. */
    goToNext: () => void
    /** Go to the previous step. Does nothing if the current step is the first one. */
    goToPrevious: () => void
    /** Go back to the given step, only if the current step is after. */
    goBackTo: (step: StepName) => void
    /** Checks whether the given step is the next step. */
    isNext: (step: StepName) => boolean
    /** Checks whether the given step is the previous step. */
    isPrevious: (step: StepName) => boolean
    /** Checks whether the given step is the current step. */
    isCurrent: (step: StepName) => boolean
    /** Checks if the current step is before the given step. */
    isBefore: (step: StepName) => boolean
    /** Checks if the current step is after the given step. */
    isAfter: (step: StepName) => boolean
  },
]

/**
 * Map from @vueuse/core `useStepper`
 * (`source/vueuse/packages/core/useStepper/`). Provides helpers for building
 * a multi-step wizard interface.
 *
 * - the return is a React tuple `[index, setIndex, controls]` instead of
 *   upstream's object, whose `index` is a writable `Ref<number>`: `index` is
 *   plain state and `setIndex` is the React setter
 *   (`Dispatch<SetStateAction<number>>`, so it accepts an updater); every
 *   other member moves onto `controls`, where upstream's readonly
 *   refs/computeds become plain values and its functions become stable
 *   callbacks (identity never changes, always reading the latest `steps`
 *   and `index`);
 * - upstream's `MaybeRefOrGetter<T[]>` steps argument becomes a plain `T[]` — pass a
 *   new array to react to steps changes; only `index` is stateful
 *   (`useState`), every other member (`current`, `next`, `previous`,
 *   `isFirst`, `isLast`, `stepNames`) is recomputed from the latest `steps`
 *   on each render, mirroring upstream's computed refs;
 * - the object-form overload (`useStepper({ a:..., b:... })`) is not ported — the issue maps the
 * array form (`T extends string | number`) only, where step names are the steps themselves;
 * - boundary semantics are upstream's: `goToNext`/`goToPrevious` are no-ops exactly at the
 * last/first step (no wrapping, guarding on the `isLast`/ `isFirst` equality like upstream), `goTo`
 * ignores steps that do not exist and `goBackTo` only moves backwards — an out-of-range index (e.g.
 * `initialStep` not in `steps`, or steps shrunk below the index) therefore still moves, matching
 * upstream;
 * - like upstream, the initial index is `steps.indexOf(initialStep ??
 *   steps[0])` — an `initialStep` that is not in `steps` therefore starts
 *   at index `-1` (`current` reads `undefined`); pass a member of `steps`.
 *
 * @example
 * const [index, setIndex, { steps, current, goToNext, goToPrevious, isFirst, isLast }] =
 *   useStepper(['billing-address', 'terms', 'payment'])
 *
 * current // 'billing-address'
 * goToNext() // 'terms'
 * setIndex(2) // 'payment'
 */
export function useStepper<T extends string | number>(steps: T[], initialStep?: T): UseStepperReturn<T, T[], T> {
  // index is the only stateful member; everything else derives from the
  // latest `steps` prop, so a new steps array re-derives without effects
  const [index, setIndex] = useState(() => steps.indexOf(initialStep ?? steps[0]))

  // latest-value refs synced each render so every control below is a stable
  // callback that always reads the newest steps and index
  const stepsRef = useRef(steps)
  const indexRef = useRef(index)
  stepsRef.current = steps
  indexRef.current = index

  const goTo = useCallback((step: T) => {
    const target = stepsRef.current.indexOf(step)
    if (target !== -1)
      setIndex(target)
  }, [])

  const goToNext = useCallback(() => {
    // no-op only exactly at the last step (upstream: `if (isLast.value)
    // return`), no wrap — an out-of-range index still increments, matching
    // upstream where `isLast` is an equality check
    setIndex(i => (i === stepsRef.current.length - 1 ? i : i + 1))
  }, [])

  const goToPrevious = useCallback(() => {
    // no-op only exactly at the first step (upstream: `if (isFirst.value)
    // return`), no wrap — an out-of-range index still decrements, matching
    // upstream where `isFirst` is an equality check
    setIndex(i => (i === 0 ? i : i - 1))
  }, [])

  const goBackTo = useCallback((step: T) => {
    // upstream: `if (isAfter(step)) goTo(step)` — only moves backwards
    const target = stepsRef.current.indexOf(step)
    if (target !== -1 && indexRef.current > target)
      setIndex(target)
  }, [])

  const at = useCallback((i: number) => stepsRef.current[i], [])

  const get = useCallback((step: T) => {
    // upstream: `at(stepNames.value.indexOf(step))` — delegate to `at()`;
    // for the array form the step at the found index is the step itself
    const index = stepsRef.current.indexOf(step)
    if (index === -1)
      return undefined
    return at(index)
  }, [at])

  const isNext = useCallback((step: T) => stepsRef.current.indexOf(step) === indexRef.current + 1, [])
  const isPrevious = useCallback((step: T) => stepsRef.current.indexOf(step) === indexRef.current - 1, [])
  const isCurrent = useCallback((step: T) => stepsRef.current.indexOf(step) === indexRef.current, [])
  const isBefore = useCallback((step: T) => indexRef.current < stepsRef.current.indexOf(step), [])
  const isAfter = useCallback((step: T) => indexRef.current > stepsRef.current.indexOf(step), [])

  // array form: step names are the steps themselves (upstream derives
  // `Object.keys` of the steps object; not ported — see JSDoc)
  const stepNames = steps
  const current = stepNames[index]
  const isFirst = index === 0
  const isLast = index === stepNames.length - 1
  const next = index + 1 < stepNames.length ? stepNames[index + 1] : undefined
  const previous = index > 0 ? stepNames[index - 1] : undefined

  const controls: UseStepperReturn<T, T[], T>[2] = {
    steps,
    stepNames,
    current,
    next,
    previous,
    isFirst,
    isLast,
    at,
    get,
    goTo,
    goToNext,
    goToPrevious,
    goBackTo,
    isNext,
    isPrevious,
    isCurrent,
    isBefore,
    isAfter,
  }

  return [index, setIndex, controls]
}
