import { useIntervalFn } from '@reause/shared'
import { useNow } from '../useNow'

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
  joinParts?: (parts: Intl.RelativeTimeFormatPart[], locale?: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale) => string

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

const UNITS: TimeAgoUnit[] = [
  { name: 'year', ms: 31_536_000_000 },
  { name: 'month', ms: 2_592_000_000 },
  { name: 'week', ms: 604_800_000 },
  { name: 'day', ms: 86_400_000 },
  { name: 'hour', ms: 3_600_000 },
  { name: 'minute', ms: 60_000 },
  { name: 'second', ms: 1_000 },
]

/**
 * Map from @vueuse/core `useTimeAgoIntl`
 * (`source/vueuse/packages/core/useTimeAgoIntl/`). A wrapper for the
 * browser-native `Intl.RelativeTimeFormat` API — reactive time ago with i18n supported.
 *
 * React divergences:
 * - upstream returns `ComputedRef<string>`, or `{ timeAgoIntl, parts,
 *   pause, resume, isActive }` with `controls: true`; this port returns a
 *   **plain string** recomputed on every render (house pattern, see
 *   `useDateFormat`), and the `controls: true` variant is intentionally not
 *   ported, consistent with `useTimeAgo` — raw
 *   `Intl.RelativeTimeFormatPart[]` access is available through
 *   `formatTimeAgoIntlParts`. A `controls: true` passed by JS callers is a
 *   no-op (the option is not read).
 * - the refresh timer lives in the house `useNow`, driven by a `useIntervalFn` scheduler that, the
 * interval keeps the result fresh in between.
 * - upstream `ConfigurableScheduler` → `updateInterval` option (default `30_000` ms, matching
 * upstream's default `useIntervalFn(cb, 30_000)`).
 * - upstream `MaybeRefOrGetter<Date | number | string>` → plain
 *   `Date | number | string`.
 *
 * @example
 * const timeAgoIntl = useTimeAgoIntl(new Date(2021, 0, 1), { locale: 'en' })
 */
export function useTimeAgoIntl(time: Date | number | string, options: UseTimeAgoIntlOptions = {}): string {
  const { updateInterval = 30_000 } = options

  const now = useNow({ scheduler: cb => useIntervalFn(cb, updateInterval) })

  return formatTimeAgoIntl(new Date(time), options, now)
}

/**
 * Non-reactive version of useTimeAgoIntl
 */
export function formatTimeAgoIntl(
  from: Date,
  options: FormatTimeAgoIntlOptions = {},
  now: Date | number = Date.now(),
): string {
  const { parts, resolvedLocale } = getTimeAgoIntlResult(from, options, now)
  return formatTimeAgoIntlParts(parts, {
    ...options,
    locale: resolvedLocale,
  })
}

/**
 * Get parts from `Intl.RelativeTimeFormat.formatToParts`.
 */
function getTimeAgoIntlResult(
  from: Date,
  options: FormatTimeAgoIntlOptions = {},
  now: Date | number = Date.now(),
): { parts: Intl.RelativeTimeFormatPart[], resolvedLocale: Intl.UnicodeBCP47LocaleIdentifier | Intl.Locale } {
  const {
    locale,
    relativeTimeFormatOptions = { numeric: 'auto' },
  } = options

  const rtf = new Intl.RelativeTimeFormat(locale, relativeTimeFormatOptions)
  const { locale: resolvedLocale } = rtf.resolvedOptions()

  const diff = +from - +now
  const absDiff = Math.abs(diff)

  const units = options.units ?? UNITS
  for (const { name, ms } of units) {
    if (absDiff >= ms) {
      return {
        resolvedLocale,
        parts: rtf.formatToParts(Math.round(diff / ms), name),
      }
    }
  }

  return {
    resolvedLocale,
    parts: rtf.formatToParts(0, units[units.length - 1].name),
  }
}

/**
 * Format parts into a string
 */
export function formatTimeAgoIntlParts(
  parts: Intl.RelativeTimeFormatPart[],
  options: FormatTimeAgoIntlOptions = {},
): string {
  const {
    insertSpace = true,
    joinParts,
    locale,
  } = options

  if (typeof joinParts === 'function')
    return joinParts(parts, locale)

  if (!insertSpace)
    return parts.map(part => part.value).join('')

  return parts
    .map(part => part.value.trim())
    .join(' ')
}
