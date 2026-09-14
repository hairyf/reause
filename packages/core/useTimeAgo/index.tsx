import { useIntervalFn } from '@reause/shared'
import { useNow } from '../useNow'

export type UseTimeAgoFormatter<T = number> = (value: T, isPast: boolean) => string

export type UseTimeAgoUnitNamesDefault = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

export interface UseTimeAgoMessagesBuiltIn {
  justNow: string
  past: string | UseTimeAgoFormatter<string>
  future: string | UseTimeAgoFormatter<string>
  invalid: string
}

export type UseTimeAgoMessages<UnitNames extends string = UseTimeAgoUnitNamesDefault>
  = UseTimeAgoMessagesBuiltIn
    & Record<UnitNames, string | UseTimeAgoFormatter<number>>

export interface FormatTimeAgoOptions<UnitNames extends string = UseTimeAgoUnitNamesDefault> {
  /**
   * Maximum unit (of diff in milliseconds) to display the full date instead of relative
   *
   * @default undefined
   */
  max?: UnitNames | number

  /**
   * Formatter for full date
   */
  fullDateFormatter?: (date: Date) => string

  /**
   * Messages for formatting the string
   */
  messages?: UseTimeAgoMessages<UnitNames>

  /**
   * Minimum display time unit (default is minute)
   *
   * @default false
   */
  showSecond?: boolean

  /**
   * Rounding method to apply.
   *
   * @default 'round'
   */
  rounding?: 'round' | 'ceil' | 'floor' | number

  /**
   * Custom units
   */
  units?: UseTimeAgoUnit<UnitNames>[]
}

export interface UseTimeAgoOptions<UnitNames extends string = UseTimeAgoUnitNamesDefault> extends FormatTimeAgoOptions<UnitNames> {
  /**
   * Interval in milliseconds at which the formatted string refreshes so the relative time stays up
   * to date.
   *
   * @default 30000
   */
  updateInterval?: number
}

export interface UseTimeAgoUnit<Unit extends string = UseTimeAgoUnitNamesDefault> {
  max: number
  value: number
  name: Unit
}

const DEFAULT_UNITS: UseTimeAgoUnit<UseTimeAgoUnitNamesDefault>[] = [
  { max: 60000, value: 1000, name: 'second' },
  { max: 2760000, value: 60000, name: 'minute' },
  { max: 72000000, value: 3600000, name: 'hour' },
  { max: 518400000, value: 86400000, name: 'day' },
  { max: 2419200000, value: 604800000, name: 'week' },
  { max: 28512000000, value: 2592000000, name: 'month' },
  { max: Number.POSITIVE_INFINITY, value: 31536000000, name: 'year' },
]

const DEFAULT_MESSAGES: UseTimeAgoMessages<UseTimeAgoUnitNamesDefault> = {
  justNow: 'just now',
  past: n => /\d/.test(n) ? `${n} ago` : n,
  future: n => /\d/.test(n) ? `in ${n}` : n,
  month: (n, past) => n === 1
    ? past
      ? 'last month'
      : 'next month'
    : `${n} month${n > 1 ? 's' : ''}`,
  year: (n, past) => n === 1
    ? past
      ? 'last year'
      : 'next year'
    : `${n} year${n > 1 ? 's' : ''}`,
  day: (n, past) => n === 1
    ? past
      ? 'yesterday'
      : 'tomorrow'
    : `${n} day${n > 1 ? 's' : ''}`,
  week: (n, past) => n === 1
    ? past
      ? 'last week'
      : 'next week'
    : `${n} week${n > 1 ? 's' : ''}`,
  hour: n => `${n} hour${n > 1 ? 's' : ''}`,
  minute: n => `${n} minute${n > 1 ? 's' : ''}`,
  second: n => `${n} second${n > 1 ? 's' : ''}`,
  invalid: '',
}

function DEFAULT_FORMATTER(date: Date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Non-reactive version of useTimeAgo
 */
export function formatTimeAgo<UnitNames extends string = UseTimeAgoUnitNamesDefault>(from: Date, options: FormatTimeAgoOptions<UnitNames> = {}, now: Date | number = Date.now()): string {
  const {
    max,
    messages = DEFAULT_MESSAGES as UseTimeAgoMessages<UnitNames>,
    fullDateFormatter = DEFAULT_FORMATTER,
    units = DEFAULT_UNITS as UseTimeAgoUnit<UnitNames>[],
    showSecond = false,
    rounding = 'round',
  } = options

  const roundFn = typeof rounding === 'number'
    ? (n: number) => +n.toFixed(rounding)
    : Math[rounding]

  const diff = +now - +from
  const absDiff = Math.abs(diff)

  function getValue(diff: number, unit: UseTimeAgoUnit<UnitNames>) {
    return roundFn(Math.abs(diff) / unit.value)
  }

  function format(diff: number, unit: UseTimeAgoUnit<UnitNames>) {
    const val = getValue(diff, unit)
    const past = diff > 0

    const str = applyFormat(unit.name as UnitNames, val, past)
    return applyFormat(past ? 'past' : 'future', str, past)
  }

  function applyFormat(name: UnitNames | keyof UseTimeAgoMessagesBuiltIn, val: number | string, isPast: boolean) {
    const formatter = messages[name]
    if (typeof formatter === 'function')
      return formatter(val as never, isPast)
    return formatter.replace('{0}', val.toString())
  }

  // less than a minute
  if (absDiff < 60000 && !showSecond)
    return messages.justNow

  if (typeof max === 'number' && absDiff > max)
    return fullDateFormatter(new Date(from))

  if (typeof max === 'string') {
    const unitMax = units.find(i => i.name === max)?.max
    if (unitMax && absDiff > unitMax)
      return fullDateFormatter(new Date(from))
  }

  for (const [idx, unit] of units.entries()) {
    const val = getValue(diff, unit)
    if (val <= 0 && units[idx - 1])
      return format(diff, units[idx - 1])
    if (absDiff < unit.max)
      return format(diff, unit)
  }

  return messages.invalid
}

/**
 * Map from @vueuse/core `useTimeAgo`
 * (`source/vueuse/packages/core/useTimeAgo/`).
 *
 * @see https://vueuse.org/useTimeAgo
 *
 * @example
 * const timeAgo = useTimeAgo(new Date(2021, 0, 1)) // string, auto-updates over time
 */
export function useTimeAgo<UnitNames extends string = UseTimeAgoUnitNamesDefault>(time: Date | number | string, options: UseTimeAgoOptions<UnitNames> = {}): string {
  const { updateInterval = 30_000 } = options

  const now = useNow({ scheduler: cb => useIntervalFn(cb, updateInterval) })

  return formatTimeAgo(new Date(time), options, now)
}
