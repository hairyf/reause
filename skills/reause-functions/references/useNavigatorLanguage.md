---
category: Sensors
---

# useNavigatorLanguage

Reactive [navigator.language](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language)

## Usage

```tsx
import { useNavigatorLanguage } from '@reause/core'

const { language, isSupported } = useNavigatorLanguage()
// `language` is a `string | undefined` state — the component re-renders on
// the window `languagechange` event
```

## Type Declarations

```ts
export interface UseNavigatorLanguageOptions extends ConfigurableWindow {}
export interface UseNavigatorLanguageReturn {
  /**
   * Whether the Navigator `language` property is available in the current window. `false` during
   * SSR and before the mount effect has probed `navigator`.
   */
  isSupported: boolean
  /**
   * ISO 639-1 standard Language Code
   *
   * @info The detected user agent language preference as a language tag (which is sometimes
   * referred to as a "locale identifier"). This consists of a 2-3 letter base language tag that
   * indicates a language, optionally followed by additional subtags separated by '-'. The most
   * common extra information is the country or region variant (like 'en-US' or 'fr-CA').
   *
   * @see https://www.iso.org/iso-639-language-codes.html
   * @see https://www.loc.gov/standards/iso639-2/php/code_list.php
   */
  language: string | undefined
}
/**
 * Map from @vueuse/core `useNavigatorLanguage`
 * (`source/vueuse/packages/core/useNavigatorLanguage/`).
 *
 * @see https://vueuse.org/core/useNavigatorLanguage/
 * @param options
 *
 * @example
 * const { language, isSupported } = useNavigatorLanguage()
 */
export declare function useNavigatorLanguage(
  options?: UseNavigatorLanguageOptions,
): UseNavigatorLanguageReturn
```
