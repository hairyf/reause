---
category: Animation
---

# useIntervalRafFn

Fire a callback repeatedly on animation frames, at a delay rounded up to the next frame

## Usage

```tsx
import { useIntervalRafFn } from '@reause/shared'

const clear = useIntervalRafFn(() => {
  /* runs again and again, on the first frame at or after 1000ms since the last run */
}, 1000)

// stop the loop
clear()
```

## Type Declarations

```ts
/**
 * Options for `useIntervalRafFn`, mirroring ahooks' inline options object.
 */
export interface UseIntervalRafFnOptions {
  /**
   * Run `fn` synchronously once when the loop is armed, before the first frame
   *
   * @default false
   */
  immediate?: boolean
}
/**
 * Map from ahooks `useRafInterval`
 * (`source/ahooks/packages/hooks/src/useRafInterval/`).
 *
 * @example
 * const clear = useIntervalRafFn(() => setCount(c => c + 1), 1000)
 * // later:
 * clear()
 *
 * @param fn Callback to run on every frame at or after `delay` has elapsed.
 * @param delay Milliseconds between fires, rounded up to the next frame.
 * `undefined`, `NaN` or a negative number disables the loop.
 * @param options `{ immediate }` runs `fn` once before the first frame.
 * @returns `clear`, a referentially stable function that cancels the running
 * loop. It returns nothing.
 */
export declare function useIntervalRafFn(
  fn: () => void,
  delay: number | undefined,
  options?: UseIntervalRafFnOptions,
): () => void
```
