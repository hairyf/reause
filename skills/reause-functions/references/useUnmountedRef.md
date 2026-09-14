---
category: Lifecycle
---

# useUnmountedRef

A ref that reports whether the component has unmounted.

## Usage

```tsx
import { useUnmountedRef } from '@reause/shared'

const unmountedRef = useUnmountedRef() // { current: boolean }

async function load() {
  const data = await fetchData()
  // `.current` is false while mounted and true once the component has unmounted
  if (unmountedRef.current)
    return
  setData(data)
}
```

## Type Declarations

```ts
/**
 * Map from ahooks `useUnmountedRef`
 * (`source/ahooks/packages/hooks/src/useUnmountedRef/`).
 *
 * @example
 * const unmountedRef = useUnmountedRef()
 *
 * async function load() {
 *   const data = await fetchData()
 *   if (unmountedRef.current) return
 *   setData(data)
 * }
 *
 * @returns A ref object whose `current` is `false` while mounted and `true`
 * after the component has unmounted; keep the object and read it later.
 */
export declare function useUnmountedRef(): {
  current: boolean
}
```
