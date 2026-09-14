---
category: Time
utils: formatTimeAgo
---

# useTimeAgo

Reactive time ago. Automatically update the time ago string when the time changes.

## Usage

```tsx
import { useTimeAgo } from '@reause/core'

const timeAgo = useTimeAgo(new Date(2021, 0, 1)) // string, auto-updates over time

// also accepts timestamps and date strings
const fromNumber = useTimeAgo(1633036800000)
const fromString = useTimeAgo('2024-01-01T00:00:00.000Z')

// show the full date when the diff exceeds `max` (unit name or milliseconds)
const cutoff = useTimeAgo(new Date(2021, 0, 1), { max: 'day' })
```

## Non-Reactivity Usage

In case you don't need the reactivity, you can use the `formatTimeAgo` function to get the formatted string instead of a controllable state.

```tsx
import { formatTimeAgo } from '@reause/core'

const timeAgo = formatTimeAgo(new Date(2021, 0, 1)) // string
```

## Type Declarations

```ts
export type UseTimeAgoFormatter<T = number> = (
  value: T,
  isPast: boolean,
) => string
export type UseTimeAgoUnitNamesDefault =
  "second" | "minute" | "hour" | "day" | "week" | "month" | "year"
export interface UseTimeAgoMessagesBuiltIn {
  justNow: string
  past: string | UseTimeAgoFormatter<string>
  future: string | UseTimeAgoFormatter<string>
  invalid: string
}
export type UseTimeAgoMessages<
  UnitNames extends string = UseTimeAgoUnitNamesDefault,
> = UseTimeAgoMessagesBuiltIn &
  Record<UnitNames, string | UseTimeAgoFormatter<number>>
export interface FormatTimeAgoOptions<
  UnitNames extends string = UseTimeAgoUnitNamesDefault,
> {
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
  rounding?: "round" | "ceil" | "floor" | number
  /**
   * Custom units
   */
  units?: UseTimeAgoUnit<UnitNames>[]
}
export interface UseTimeAgoOptions<
  UnitNames extends string = UseTimeAgoUnitNamesDefault,
> extends FormatTimeAgoOptions<UnitNames> {
  /**
   * Interval in milliseconds at which the formatted string refreshes so the relative time stays up
   * to date.
   *
   * @default 30000
   */
  updateInterval?: number
}
export interface UseTimeAgoUnit<
  Unit extends string = UseTimeAgoUnitNamesDefault,
> {
  max: number
  value: number
  name: Unit
}
/**
 * Non-reactive version of useTimeAgo
 */
export declare function formatTimeAgo<
  UnitNames extends string = UseTimeAgoUnitNamesDefault,
>(
  from: Date,
  options?: FormatTimeAgoOptions<UnitNames>,
  now?: Date | number,
): string
/**
 * Map from @vueuse/core `useTimeAgo`
 * (`source/vueuse/packages/core/useTimeAgo/`).
 *
 * @see https://vueuse.org/useTimeAgo
 *
 * @example
 * const timeAgo = useTimeAgo(new Date(2021, 0, 1)) // string, auto-updates over time
 */
export declare function useTimeAgo<
  UnitNames extends string = UseTimeAgoUnitNamesDefault,
>(time: Date | number | string, options?: UseTimeAgoOptions<UnitNames>): string
```
