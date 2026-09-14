---
category: Animation
---

# useTimeoutRafFn

Fire a callback once on the first animation frame at or after a delay, then stop

## Usage

```tsx
import { useTimeoutRafFn } from '@reause/shared'

const clear = useTimeoutRafFn(() => {
  /* runs once, on the first frame at or after 1000ms */
}, 1000)

// cancel the pending timeout before the deadline
clear()
```


## Type Declarations

```ts
/**
 * Map from ahooks `useRafTimeout`
 * (`source/ahooks/packages/hooks/src/useRafTimeout/`).
 *
 * @example
 * const clear = useTimeoutRafFn(() => setVisible(false), 1000)
 * // later, before the deadline:
 * clear()
 *
 * @param fn Callback to run once, on the first frame at or after `delay`.
 * @param delay Milliseconds to wait. `undefined`, `NaN` or a negative number
 * disables the timeout.
 * @returns `clear`, a referentially stable function that cancels the pending
 * timeout. It returns nothing.
 */
export declare function useTimeoutRafFn(
  fn: () => void,
  delay: number | undefined,
): () => void
```
