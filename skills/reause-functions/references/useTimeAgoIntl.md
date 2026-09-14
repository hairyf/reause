---
category: Time
utils: formatTimeAgoIntl
---

# useTimeAgoIntl

Reactive time ago with i18n supported. Automatically update the time ago string when the time changes. Powered by `Intl.RelativeTimeFormat`.

## Usage

```tsx
import { useTimeAgoIntl } from '@reause/core'

const timeAgoIntl = useTimeAgoIntl(new Date(2021, 0, 1), { locale: 'en' }) // string, auto-updates over time

// also accepts timestamps and date strings
const fromNumber = useTimeAgoIntl(1633036800000)
const fromString = useTimeAgoIntl('2024-01-01T00:00:00.000Z')
```

## Non-Reactivity Usage

In case you don't need the reactivity, you can use the `formatTimeAgoIntl` function to get the formatted string instead of a controllable state.

```tsx
import { formatTimeAgoIntl } from '@reause/core'

const timeAgoIntl = formatTimeAgoIntl(new Date(2021, 0, 1)) // string
```

## Type Declarations

```ts
export interface TimeAgoUnit {
  name: Intl.RelativeTimeFormatUnit
  ms: number
}
export interface FormatTimeAgoIntlOptions {
  /**
   * The locale to format with
   *
   * @default undefined
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat/RelativeTimeFormat#locales
   */
  locale?: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat/RelativeTimeFormat#options
   */
  relativeTimeFormatOptions?: Intl.RelativeTimeFormatOptions
  /**
   * Whether to insert spaces between parts.
   *
   * Ignored if `joinParts` is provided.
   *
   * @default true
   */
  insertSpace?: boolean
  /**
   * Custom function to join the parts returned by `Intl.RelativeTimeFormat.formatToParts`.
   *
   * If provided, it will be used instead of the default join logic.
   */
  joinParts?: (
    parts: Intl.RelativeTimeFormatPart[],
    locale?: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale,
  ) => string
  /**
   * Custom units
   */
  units?: TimeAgoUnit[]
}
export interface UseTimeAgoIntlOptions extends FormatTimeAgoIntlOptions {
  /**
   * Interval in milliseconds at which the formatted string refreshes so the relative time stays up
   * to date.
   *
   * @default 30000
   */
  updateInterval?: number
}
/**
 * Map from @vueuse/core `useTimeAgoIntl`
 * (`source/vueuse/packages/core/useTimeAgoIntl/`).
 *
 * @example
 * const timeAgoIntl = useTimeAgoIntl(new Date(2021, 0, 1), { locale: 'en' })
 */
export declare function useTimeAgoIntl(
  time: Date | number | string,
  options?: UseTimeAgoIntlOptions,
): string
/**
 * Non-reactive version of useTimeAgoIntl
 */
export declare function formatTimeAgoIntl(
  from: Date,
  options?: FormatTimeAgoIntlOptions,
  now?: Date | number,
): string
/**
 * Format parts into a string
 */
export declare function formatTimeAgoIntlParts(
  parts: Intl.RelativeTimeFormatPart[],
  options?: FormatTimeAgoIntlOptions,
): string
```
