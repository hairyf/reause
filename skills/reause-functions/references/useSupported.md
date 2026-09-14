---
category: Utilities
---

# useSupported

SSR compatibility `isSupported`

## Usage

```tsx
import { useSupported } from '@reause/core'

const isSupported = useSupported(() => navigator && 'getBattery' in navigator)

if (isSupported) {
  // Battery Status API is available
}
```

## Type Declarations

```ts
/**
 * Return type of `useSupported` — a plain boolean state.
 *
 * Upstream's alias is `ComputedRef<boolean>`; React has no computed refs, so the compliant port
 * returns the plain `boolean` the hook holds.
 */
export type UseSupportedReturn = boolean
/**
 * Map from @vueuse/core `useSupported`
 * (`source/vueuse/packages/core/useSupported/`).
 *
 * @example
 * const isSupported = useSupported(() => navigator && 'getBattery' in navigator)
 */
export declare function useSupported(
  callback: () => unknown,
): UseSupportedReturn
```
