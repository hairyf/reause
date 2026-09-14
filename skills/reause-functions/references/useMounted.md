---
category: Component
---

# useMounted

Mounted state in ref.

## Usage

```tsx
import { useMounted } from '@reause/core'

const isMounted = useMounted() // boolean
// starts `false`, flips to `true` in a mount effect — stays `false` during SSR/hydration
```

For the inverse question — whether a component has already unmounted, readable from a callback that outlives the render — use `@reause/shared`'s `useUnmountedRef` instead: `useMounted` returns a boolean for the current render and never flips back, so after unmount it stays `true`, whereas `useUnmountedRef` returns a ref whose `.current` becomes `true` and can be read after the component is gone.

## Type Declarations

```ts
/**
 * Map from @vueuse/core `useMounted`
 * (`source/vueuse/packages/core/useMounted/`).
 *
 * @example
 * const isMounted = useMounted()
 */
export declare function useMounted(): boolean
```
