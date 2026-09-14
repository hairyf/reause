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
   * Interval in milliseconds at which the formatted string refreshes so the
   * relative time stays up to date (upstream: `ConfigurableScheduler`, whose
   * default ticks every `30_000` ms).
   *
   * @default 30000
   */
  updateInterval?: number
}
/**
 * React port of VueUse's `useTimeAgoIntl`.
 *
 * Map from @vueuse/core `useTimeAgoIntl`
 * (`source/vueuse/packages/core/useTimeAgoIntl/`). A wrapper for the
 * browser-native `Intl.RelativeTimeFormat` API — reactive time ago with
 * i18n supported.
 *
 * Divergences from upstream:
 * - upstream returns `ComputedRef<string>`, or `{ timeAgoIntl, parts,
 *   pause, resume, isActive }` with `controls: true`; this port returns a
 *   **plain string** recomputed on every render (house pattern, see
 *   `useDateFormat`), and the `controls: true` variant is intentionally not
 *   ported, consistent with `useTimeAgo` — raw
 *   `Intl.RelativeTimeFormatPart[]` access is available through
 *   `formatTimeAgoIntlParts`. A `controls: true` passed by JS callers is a
 *   no-op (the option is not read).
 * - the refresh timer lives in the house `useNow`, driven by a
 *   `useIntervalFn` scheduler that is cleaned up on unmount — pass new
 *   `time` values to re-render, the interval keeps the result fresh in
 *   between.
 * - upstream `ConfigurableScheduler` → `updateInterval` option (default
 *   `30_000` ms, matching upstream's default `useIntervalFn(cb, 30_000)`).
 * - upstream `MaybeRefOrGetter<Date | number | string>` → plain
 *   `Date | number | string`.
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
