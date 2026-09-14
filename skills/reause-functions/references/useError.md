---
category: Side-effects
---

# useError

Returns a referentially stable error dispatcher whose error is re-thrown from a `useEffect` on the next render, so the nearest Error Boundary catches it — React port of react-use's [`useError`](https://streamich.github.io/react-use/?path=/story/side-effects-useerror--docs) (mapped from `source/react-use/src/useError.ts` and `source/react-use/docs/useError.md`).

## Usage

```tsx
import { useError } from '@reause/shared'

function ThrowButton() {
  const dispatchError = useError()

  // dispatch from an event handler / async callback: `dispatchError` never
  // throws itself, the error surfaces on the following render
  return <button onClick={() => dispatchError(new Error('boom'))}>throw</button>
}

// wrap the tree in an Error Boundary so the re-thrown error is caught
```

## Type Declarations

```ts
/**
 * Map from react-use `useError`.
 *
 * @example
 * const dispatchError = useError()
 * dispatchError(new Error('boom')) // re-thrown from the next render
 */
export declare function useError(): (err: Error) => void
```
