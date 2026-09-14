---
category: State
---

# useSafeState

A `useState` whose setter is a no-op once the component has unmounted.

## Usage

```tsx
import { useSafeState } from '@reause/shared'

const [value, setValue] = useSafeState(0)

async function load() {
  const data = await fetchData()
  // ignored if the component unmounted while the request was in flight
  setValue(data)
}
```

## Type Declarations

```ts
/**
 * Map from ahooks `useSafeState`
 * (`source/ahooks/packages/hooks/src/useSafeState/`).
 *
 * @example
 * const [value, setValue] = useSafeState(0)
 *
 * async function load() {
 *   const data = await fetchData()
 *   // ignored once the component has unmounted
 *   setValue(data)
 * }
 *
 * @example
 * const [count, setCount] = useSafeState(0)
 * setCount(previous => previous + 1)
 *
 * @param initialState Either the initial value or a lazy factory for it; both
 * forms are handed straight to `useState`.
 * @returns A tuple of the current state and a referentially stable setter that
 * is a no-op once the component has unmounted.
 */
export declare function useSafeState<S>(
  initialState: S | (() => S),
): [S, Dispatch<SetStateAction<S>>]
export declare function useSafeState<S = undefined>(): [
  S | undefined,
  Dispatch<SetStateAction<S | undefined>>,
]
```
