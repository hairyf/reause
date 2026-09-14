---
category: Utilities
---

# useStepper

Provides helpers for building a multi-step wizard interface.

## Usage

### Steps as array

```tsx
import { useStepper } from '@reause/core'

const {
  index,
  setIndex,
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
} = useStepper([
  'billing-address',
  'terms',
  'payment',
])

// Access the step through `current`
console.log(current) // 'billing-address'
```

## Type Declarations

```ts
export interface UseStepperReturn<StepName, Steps, Step> {
  /** Index of the current step. */
  index: number
  /**
   * Setter for the current step index — `setIndex(next)` or `setIndex(prev => next)`.
   */
  setIndex: Dispatch<SetStateAction<number>>
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
}
/**
 * Map from @vueuse/core `useStepper`
 * (`source/vueuse/packages/core/useStepper/`).
 *
 * Upstream returns an object of writable/readonly refs and computeds; reause keeps the object shape
 * with plain values — `index` is React state paired with its `setIndex` setter, and every other
 * member is a plain value or a stable callback (no `.value` access). The object form of `steps` is
 * not ported: pass an array, where the step names are the steps themselves.
 *
 * @example
 * const { index, setIndex, steps, current, goToNext, goToPrevious, isFirst, isLast } =
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
