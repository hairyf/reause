---
category: Lifecycle
---

# useTrackedEffect

`useEffect` that also reports **which** dependencies changed.

## Usage

```tsx
import { useTrackedEffect } from '@reause/shared'

// one effect that refetches several things, reacting only to the dep that moved
useTrackedEffect((changes, previousDeps, currentDeps) => {
  if (changes?.includes(0))
    refetchA()
  if (changes?.includes(1))
    refetchB()
}, [a, b])
```

## Type Declarations

```ts
type Effect<T extends DependencyList> = (
  changes?: number[],
  previousDeps?: T,
  currentDeps?: T,
) => void | (() => void)
/**
 * Map from ahooks `useTrackedEffect`
 * (`source/ahooks/packages/hooks/src/useTrackedEffect/`).
 *
 * @example
 * useTrackedEffect((changes) => {
 *   if (changes?.includes(0)) refetchA()
 *   if (changes?.includes(1)) refetchB()
 * }, [a, b])
 */
export declare function useTrackedEffect<T extends DependencyList>(
  effect: Effect<T>,
  deps?: [...T],
): void
```
