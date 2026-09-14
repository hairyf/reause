---
category: Elements
---

# useDocumentVisibility

Reactively track [`document.visibilityState`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState)

## Usage

```tsx
import { useDocumentVisibility } from '@reause/core'

const visibility = useDocumentVisibility() // 'visible' | 'hidden'
```

## Type Declarations

```ts
export interface UseDocumentVisibilityOptions {
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   *
   * @default typeof document !== 'undefined' ? document : undefined
   */
  document?: Document | null
}
/**
 * Map from @vueuse/core `useDocumentVisibility`
 * (`source/vueuse/packages/core/useDocumentVisibility/`).
 *
 * @example
 * const visibility = useDocumentVisibility()
 */
export declare function useDocumentVisibility(
  options?: UseDocumentVisibilityOptions,
): DocumentVisibilityState
```
