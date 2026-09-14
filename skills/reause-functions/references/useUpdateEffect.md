---
category: Lifecycle
---

# useUpdateEffect

`useEffect` that skips the first render.

## Usage

```tsx
import { useUpdateEffect } from '@reause/shared'

useUpdateEffect(() => {
  console.log('count changed, but not on mount')
}, [count])
```

## Type Declarations

```ts
/**
 * Map from react-use `useUpdateEffect`.
 *
 * @example
 * useUpdateEffect(() => {
 *   console.log('count changed, but not on mount')
 * }, [count])
 */
export declare function useUpdateEffect(
  effect: EffectCallback,
  deps?: DependencyList,
): void
```
