---
category: Animation
---

# useRafState

State updates coalesced into an animation frame.

## Usage

```tsx
import { useRafState } from '@reause/shared'

const [state, setRafState] = useRafState(0)

// three calls inside one frame: a single re-render, with `state === 3`
setRafState(1)
setRafState(2)
setRafState(3)
```

## Type Declarations

```ts
/**
 * Map from react-use `useRafState`.
 *
 * @example
 * const [state, setRafState] = useRafState(0)
 *
 * // three calls in one frame → one re-render, state === 3
 * setRafState(1)
 * setRafState(2)
 * setRafState(3)
 */
export declare function useRafState<S>(
  initialState: S | (() => S),
): [S, Dispatch<SetStateAction<S>>]
```
