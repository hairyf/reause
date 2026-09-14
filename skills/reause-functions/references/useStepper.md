---
category: Utilities
---

# useStepper

Provides helpers for building a multi-step wizard interface.

## Usage

### Steps as array

```tsx
import { useStepper } from '@reause/core'

const [index, setIndex, {
  steps,
  stepNames,
  current,
  next,
  previous,
  isFirst,
  isLast,
  goTo,
  goToNext,
  goToPrevious,
  goBackTo,
  isNext,
  isPrevious,
  isCurrent,
  isBefore,
  isAfter,
}] = useStepper([
  'billing-address',
  'terms',
  'payment',
])

// Access the step through `current`
console.log(current) // 'billing-address'
```

The return is a React tuple `[index, setIndex, controls]` — upstream returns an object whose `index` is a
writable `Ref<number>` and whose other members are readonly refs/computeds. `index` is plain state,
`setIndex` is the React setter, and `controls` exposes the remaining members as plain values and stable
callbacks.

### Steps as object

The object form is not ported — pass an array of steps, where step names are the steps themselves.

## Return Values

- `index` — index of the current step.
- `setIndex(next | prev => next)` — setter for the current step index.
- `controls.steps` — list of steps.
- `controls.stepNames` — list of step names.
- `controls.current` — current step.
- `controls.next` — next step, or `undefined` if the current step is the last one.
- `controls.previous` — previous step, or `undefined` if the current step is the first one.
- `controls.isFirst` — whether the current step is the first one.
- `controls.isLast` — whether the current step is the last one.
- `controls.at(index)` — get the step at the specified index.
- `controls.get(step)` — get a step by the specified name.
- `controls.goTo(step)` — go to the specified step. Does nothing if the step does not exist.
- `controls.goToNext()` — go to the next step. Does nothing if the current step is the last one.
- `controls.goToPrevious()` — go to the previous step. Does nothing if the current step is the first one.
- `controls.goBackTo(step)` — go back to the given step, only if the current step is after.
- `controls.isNext(step)` — checks whether the given step is the next step.
- `controls.isPrevious(step)` — checks whether the given step is the previous step.
- `controls.isCurrent(step)` — checks whether the given step is the current step.
- `controls.isBefore(step)` — checks if the current step is before the given step.
- `controls.isAfter(step)` — checks if the current step is after the given step.

## Type Declarations

```ts
export type UseStepperReturn<StepName, Steps, Step> = readonly [
  /** Index of the current step. */
  index: number,
  /**
   * Setter for the current step index — `setIndex(next)` or
   * `setIndex(prev => next)`.
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
 * React port of VueUse's `useStepper`.
 *
 * Map from @vueuse/core `useStepper`
 * (`source/vueuse/packages/core/useStepper/`). Provides helpers for building
 * a multi-step wizard interface.
 *
 * React divergences:
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
 * - the object-form overload (`useStepper({ a: ..., b: ... })`) is not
 *   ported — the issue maps the array form (`T extends string | number`)
 *   only, where step names are the steps themselves;
 * - boundary semantics are upstream's: `goToNext`/`goToPrevious` are no-ops
 *   exactly at the last/first step (no wrapping, guarding on the `isLast`/
 *   `isFirst` equality like upstream), `goTo` ignores steps that do not
 *   exist and `goBackTo` only moves backwards — an out-of-range index
 *   (e.g. `initialStep` not in `steps`, or steps shrunk below the index)
 *   therefore still moves, matching upstream;
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
export declare function useStepper<T extends string | number>(
  steps: T[],
  initialStep?: T,
): UseStepperReturn<T, T[], T>
```
