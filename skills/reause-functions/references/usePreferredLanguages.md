---
category: Browser
---

# usePreferredLanguages

Reactive Navigator Languages

## Usage

```tsx
import { usePreferredLanguages } from '@reause/core'

const languages = usePreferredLanguages() // readonly string[]
// e.g. ['en-US', 'en'] — re-renders on the window `languagechange` event
```

## Type Declarations

```ts
/**
 * Map from @vueuse/core `usePreferredLanguages`
 * (`source/vueuse/packages/core/usePreferredLanguages/`).
 *
 * @see https://vueuse.org/core/usePreferredLanguages/
 * @param options
 *
 * @example
 * const languages = usePreferredLanguages()
 */
export declare function usePreferredLanguages(
  options?: ConfigurableWindow,
): readonly string[]
```
