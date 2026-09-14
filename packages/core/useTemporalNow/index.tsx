import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRafFn } from '../useRafFn'

/**
 * Structural subset of `Temporal.DurationLike` (the repo's TypeScript libs do not ship Temporal
 * types yet, so this port describes the Temporal surface it uses with minimal inline structural
 * types instead).
 */
export interface TemporalDurationLike {
  days?: number
  hours?: number
  microseconds?: number
  milliseconds?: number
  minutes?: number
  months?: number
  nanoseconds?: number
  seconds?: number
  weeks?: number
  years?: number
}

/**
 * Structural subset of `Temporal.PlainDate`.
 */
export interface TemporalPlainDate {
  toString: () => string
}

/**
 * Structural subset of `Temporal.PlainTime`.
 */
export interface TemporalPlainTime {
  toString: () => string
}

/**
 * Structural subset of `Temporal.PlainDateTime`.
 */
export interface TemporalPlainDateTime {
  toString: () => string
}

/**
 * Structural subset of `Temporal.ZonedDateTime`.
 */
export interface TemporalZonedDateTime {
  readonly epochNanoseconds: bigint
  readonly timeZoneId: string
  readonly calendarId: string
  withTimeZone: (timezone: string) => TemporalZonedDateTime
  withCalendar: (calendar: string) => TemporalZonedDateTime
  toPlainDate: () => TemporalPlainDate
  toPlainTime: () => TemporalPlainTime
  toPlainDateTime: () => TemporalPlainDateTime
  toLocaleString: (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) => string
  add: (duration: TemporalDurationLike | string) => TemporalZonedDateTime
  subtract: (duration: TemporalDurationLike | string) => TemporalZonedDateTime
}

/**
 * Structural subset of the `Temporal` namespace used by this hook. Any spec-compliant
 * implementation can be passed as the `temporal` option, e.g. the `Temporal` export of
 * `temporal-polyfill` or `@js-temporal/polyfill`.
 */
export interface TemporalImplementation {
  Now: {
    zonedDateTimeISO: (timezone?: string) => TemporalZonedDateTime
  }
  ZonedDateTime: {
    compare: (a: TemporalZonedDateTime, b: TemporalZonedDateTime | string) => number
  }
}

export interface UseTemporalNowOptions {
  /**
   * Initial timezone
   *
   * @default 'UTC'
   */
  timezone?: string
  /**
   * Calendar system to use
   *
   * @default 'gregory'
   */
  calendar?: string
  /**
   * Custom `Temporal` implementation to use, e.g. the `Temporal` export from `temporal-polyfill` or
   * `@js-temporal/polyfill`, instead of relying on the global `Temporal` object.
   *
   * @default globalThis.Temporal
   */
  temporal?: TemporalImplementation
  /**
   * Custom scheduler driving the `now` updates. Called during render, so it must follow the Rules
   * of Hooks (pass it consistently across renders) — e.g. `scheduler: cb => useIntervalFn(cb, 500,
   * { immediate: false })` with `useIntervalFn` from `@reause/shared`.
   *
   * @default requestAnimationFrame loop, started immediately
   */
  scheduler?: UseTemporalNowScheduler
}

/**
 * Pausable controls for the `now` update loop.
 */
export interface UseTemporalNowControls {
  /**
   * Whether the update loop is currently active
   */
  isActive: boolean

  /**
   * Pause the update loop
   */
  pause: () => void

  /**
   * Resume the update loop
   */
  resume: () => void
}

/**
 * Drives `now` updates and reports pausable controls.
 */
export type UseTemporalNowScheduler = (updateNow: () => void) => UseTemporalNowControls

export interface UseTemporalNowReturn extends UseTemporalNowControls {
  /**
   * Current `Temporal.ZonedDateTime`
   */
  now: TemporalZonedDateTime
  /**
   * Current timezone
   */
  timezone: string
  /**
   * Current calendar
   */
  calendar: string
  /**
   * Change the timezone — `now` is refreshed immediately
   */
  setTimezone: Dispatch<SetStateAction<string>>
  /**
   * Change the calendar — `now` is refreshed immediately
   */
  setCalendar: Dispatch<SetStateAction<string>>
  /**
   * Convert to a different timezone
   */
  toTimezone: (timezone: string) => TemporalZonedDateTime
  /**
   * Convert to a different calendar
   */
  toCalendar: (calendar: string) => TemporalZonedDateTime
  /**
   * Get the `Temporal.PlainDate` (date only)
   */
  toPlainDate: () => TemporalPlainDate
  /**
   * Get the `Temporal.PlainTime` (time only)
   */
  toPlainTime: () => TemporalPlainTime
  /**
   * Get the `Temporal.PlainDateTime` (local date/time)
   */
  toPlainDateTime: () => TemporalPlainDateTime
  /**
   * Format the current date/time
   */
  format: (options?: Intl.DateTimeFormatOptions) => string
  /**
   * Add a duration. Accepts a structural `TemporalDurationLike` or an ISO 8601 duration string — a
   * deliberate widening of upstream's `Temporal.DurationLike` to also take strings (e.g.
   * `add('P7D')`), which upstream's runtime accepts as well.
   */
  add: (duration: TemporalDurationLike | string) => TemporalZonedDateTime
  /**
   * Subtract a duration. Accepts a structural `TemporalDurationLike` or an ISO 8601 duration string
   * — same widening as `add`.
   */
  subtract: (duration: TemporalDurationLike | string) => TemporalZonedDateTime
  /**
   * Compare with another date/time
   */
  compare: (other: TemporalZonedDateTime | string) => number
}

function resolveTemporal(custom?: TemporalImplementation): TemporalImplementation | undefined {
  if (custom)
    return custom
  return (globalThis as { Temporal?: TemporalImplementation }).Temporal
}

function assertTemporal(impl: TemporalImplementation | undefined): TemporalImplementation {
  if (!impl)
    throw new Error('[reause] No `Temporal` implementation found. Provide a global `Temporal` (native or polyfill) or pass the `temporal` option.')
  return impl
}

function createZonedDateTimeISO(timezone: string, calendar: string, impl: TemporalImplementation): TemporalZonedDateTime {
  return impl.Now.zonedDateTimeISO(timezone).withCalendar(calendar)
}

/**
 * Map from @vueuse/core `useTemporalNow`
 * (`source/vueuse/packages/core/useTemporalNow/`).
 *
 * @example
 * const { now, timezone, calendar, format } = useTemporalNow()
 *
 * console.log(format()) // "12/25/2023, 3:30:00 PM"
 */
export function useTemporalNow(options: UseTemporalNowOptions = {}): UseTemporalNowReturn {
  const {
    timezone: initialTimezone = 'UTC',
    calendar: initialCalendar = 'gregory',
    temporal: customTemporal,
    scheduler,
  } = options

  // resolve + create before the first hook call: a missing `Temporal`
  // implementation or an invalid timezone/calendar throws deterministically
  // (upstream: throws during setup)
  const temporalImpl = assertTemporal(resolveTemporal(customTemporal))
  const initialNow = createZonedDateTimeISO(initialTimezone, initialCalendar, temporalImpl)

  const [timezone, setTimezone] = useState(initialTimezone)
  const [calendar, setCalendar] = useState(initialCalendar)
  const [now, setNow] = useState(initialNow)

  // latest-value refs synced each render so every control below is a stable
  // callback that always reads the newest values
  const temporalRef = useRef(temporalImpl)
  const timezoneRef = useRef(initialTimezone)
  const calendarRef = useRef(initialCalendar)
  const nowRef = useRef(now)
  temporalRef.current = temporalImpl
  timezoneRef.current = timezone
  calendarRef.current = calendar
  nowRef.current = now

  const updateNow = useCallback(() => {
    setNow(createZonedDateTimeISO(timezoneRef.current, calendarRef.current, temporalRef.current))
  }, [])

  // update immediately when timezone/calendar change, rather than waiting for
  // the next tick (upstream: watch([timezone, calendar], updateNow))
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    updateNow()
  }, [timezone, calendar, updateNow])

  const { isActive, pause, resume } = (scheduler ?? useRafFn)(updateNow)

  const toTimezone = useCallback(
    (tz: string) => nowRef.current.withTimeZone(tz),
    [],
  )
  const toCalendar = useCallback(
    (cal: string) => nowRef.current.withCalendar(cal),
    [],
  )
  const toPlainDate = useCallback(() => nowRef.current.toPlainDate(), [])
  const toPlainTime = useCallback(() => nowRef.current.toPlainTime(), [])
  const toPlainDateTime = useCallback(() => nowRef.current.toPlainDateTime(), [])
  const format = useCallback(
    (formatOptions?: Intl.DateTimeFormatOptions) => nowRef.current.toLocaleString(undefined, formatOptions),
    [],
  )
  const add = useCallback(
    (duration: TemporalDurationLike | string) => nowRef.current.add(duration),
    [],
  )
  const subtract = useCallback(
    (duration: TemporalDurationLike | string) => nowRef.current.subtract(duration),
    [],
  )
  const compare = useCallback(
    (other: TemporalZonedDateTime | string) => temporalRef.current.ZonedDateTime.compare(nowRef.current, other),
    [],
  )

  return {
    now,
    timezone,
    calendar,
    setTimezone,
    setCalendar,
    toTimezone,
    toCalendar,
    toPlainDate,
    toPlainTime,
    toPlainDateTime,
    format,
    add,
    subtract,
    compare,
    isActive,
    pause,
    resume,
  }
}
