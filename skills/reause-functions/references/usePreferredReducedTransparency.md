---
category: Browser
---

# usePreferredReducedTransparency

Reactive [`prefers-reduced-transparency`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency) media query

## Usage

```tsx
import { usePreferredReducedTransparency } from '@reause/core'

const transparency = usePreferredReducedTransparency() // 'reduce' | 'no-preference'
```

## Type Declarations

```ts
export type ReducedTransparencyType = "reduce" | "no-preference"
/**
 * Map from @vueuse/core `usePreferredReducedTransparency`
 * (`source/vueuse/packages/core/usePreferredReducedTransparency/`).
 *
 * @example
 * const transparency = usePreferredReducedTransparency()
 */
export declare function usePreferredReducedTransparency(
  options?: ConfigurableWindow,
): ReducedTransparencyType
```
