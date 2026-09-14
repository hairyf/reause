---
category: State
---

# useCounter

A basic counter with `inc` / `dec` / `set` / `reset` and optional `min` / `max` bounds

## Basic Usage

```tsx
import { useCounter } from '@reause/shared'

const { count, inc, dec, set, reset } = useCounter()
```

## Usage with options

```tsx
import { useCounter } from '@reause/shared'

const { count, inc, dec, set, reset } = useCounter(1, { min: 0, max: 16 })
```

## Type Declarations

```ts
export interface UseCounterOptions {
  min?: number
  max?: number
}
export interface UseCounterReturn {
  /**
   * The current value of the counter.
   */
  count: number
  /**
   * Increment the counter.
   *
   * @param {number} [delta=1] The number to increment.
   */
  inc: (delta?: number) => void
  /**
   * Decrement the counter.
   *
   * @param {number} [delta=1] The number to decrement.
   */
  dec: (delta?: number) => void
  /**
   * Get the current value of the counter — the latest rendered value (React state updates are
   * applied on the next render, so a read right after `inc` / `dec` / `set` still sees the previous
   * value).
   */
  get: () => number
  /**
   * Set the counter to a new value (clamped to `[min, max]`).
   *
   * @param value The new value of the counter.
   */
  set: (value: number) => void
  /**
   * Reset the counter to the initial value — or to `val` when passed, which also rebases the value
   * future resets restore — and return the new value.
   *
   * @param val The value to reset to (defaults to the initial value).
   */
  reset: (val?: number) => number
}
/**
 * Map from @vueuse/shared `useCounter`.
 *
 * @example
 * const { count, inc, dec, set, reset } = useCounter(10, { min: 0, max: 100 })
 */
export declare function useCounter(
  initialValue?: State<number>,
  options?: UseCounterOptions,
): UseCounterReturn
```
