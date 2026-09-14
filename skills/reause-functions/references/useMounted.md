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
