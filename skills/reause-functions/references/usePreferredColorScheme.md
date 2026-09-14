---
category: Browser
---

# usePreferredColorScheme

Reactive [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) media query

## Usage

```tsx
import { usePreferredColorScheme } from '@reause/core'

const colorScheme = usePreferredColorScheme() // 'dark' | 'light' | 'no-preference'
```

## Type Declarations

```ts
export type ColorSchemeType = "dark" | "light" | "no-preference"
/**
 * Map from @vueuse/core `usePreferredColorScheme`
 * (`source/vueuse/packages/core/usePreferredColorScheme/`).
 *
 * @example
 * const colorScheme = usePreferredColorScheme() // 'dark' | 'light' | 'no-preference'
 */
export declare function usePreferredColorScheme(
  options?: ConfigurableWindow,
): ColorSchemeType
```
