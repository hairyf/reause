---
category: Browser
---

# usePreferredContrast

Reactive [`prefers-contrast`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) media query

## Usage

```tsx
import { usePreferredContrast } from '@reause/core'

const contrast = usePreferredContrast() // 'more' | 'less' | 'custom' | 'no-preference'
```

## Type Declarations

```ts
export type ContrastType = "more" | "less" | "custom" | "no-preference"
/**
 * Map from @vueuse/core `usePreferredContrast`
 * (`source/vueuse/packages/core/usePreferredContrast/`).
 *
 * @example
 * const contrast = usePreferredContrast()
 */
export declare function usePreferredContrast(
  options?: ConfigurableWindow,
): ContrastType
```
