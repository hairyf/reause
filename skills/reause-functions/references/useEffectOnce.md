---
category: Lifecycle
---

# useEffectOnce

Runs an effect once after the component mounts, and forwards the cleanup that effect returns.

## Usage

```tsx
import { useEffectOnce } from '@reause/shared'

useEffectOnce(() => {
  const subscription = source.subscribe()

  // forwarded to React by `useEffectOnce`: runs on unmount
  return () => subscription.unsubscribe()
})
```

## Type Declarations

```ts
/**
 * Map from react-use `useEffectOnce` (upstream file `source/react-use/src/useEffectOnce.ts`).
 *
 * @example
 * useEffectOnce(() => {
 *   const subscription = source.subscribe()
 *   return () => subscription.unsubscribe()
 * })
 */
export declare function useEffectOnce(effect: EffectCallback): void
```
