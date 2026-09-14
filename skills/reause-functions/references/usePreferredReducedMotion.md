---
category: Browser
---

# usePreferredReducedMotion

Reactive [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) media query

## Usage

```tsx
import { usePreferredReducedMotion } from '@reause/core'

const motion = usePreferredReducedMotion() // 'reduce' | 'no-preference'
```

## Type Declarations

```ts
export type ReducedMotionType = "reduce" | "no-preference"
/**
 * Map from @vueuse/core `usePreferredReducedMotion`
 * (`source/vueuse/packages/core/usePreferredReducedMotion/`).
 *
 * @example
 * const motion = usePreferredReducedMotion()
 */
export declare function usePreferredReducedMotion(
  options?: ConfigurableWindow,
): ReducedMotionType
```
