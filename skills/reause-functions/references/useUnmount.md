---
category: Lifecycle
---

# useUnmount

Runs a callback when the component unmounts.

## Usage

```tsx
import { useUnmount } from '@reause/shared'

useUnmount(() => cleanup())
```

## Type Declarations

```ts
/**
 * Map from react-use `useUnmount`.
 *
 * @example
 * useUnmount(() => cleanup())
 */
export declare function useUnmount(fn: () => any): void
```
