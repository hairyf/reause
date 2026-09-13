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
 * React port of react-use's `useError`.
 *
 * Map from react-use `useError`
 * Mapping: mirrors the upstream hook as-is — the `error` state stays internal
 * (react-use never exposes it) and only the `dispatchError` callback is
 * returned. The error is re-thrown from a `useEffect` keyed on that state, so
 * it surfaces on the render **after** the dispatch and the nearest Error
 * Boundary catches it; `dispatchError` itself never throws. Upstream ships this
 * hook as a default export, reause keeps the same API shape behind a named
 * export. React-only capability: Vue has no render-throw / Error Boundary
 * equivalent, so VueUse can never provide a counterpart.
 *
 * @example
 * const dispatchError = useError()
 * dispatchError(new Error('boom')) // re-thrown from the next render
 */
export declare function useError(): (err: Error) => void
```
