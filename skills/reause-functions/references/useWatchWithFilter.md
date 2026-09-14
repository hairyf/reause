---
category: Watch
---

# useWatchWithFilter

`watch` with additional EventFilter control

## Usage

Similar to `useWatch`, but with an `eventFilter` option that controls if events
should be received:

```tsx
import { useWatchWithFilter } from '@reause/shared'

useWatchWithFilter(
  input,
  () => { console.log('changed!') },
)
```

### Options

| Option        | Type          | Default                  | Description                                                             |
| ------------- | ------------- | ------------------------ | ----------------------------------------------------------------------- |
| `eventFilter` | `EventFilter` | bypass (invoke directly) | Filter for if events should be received (captured on mount)             |
| `immediate`   | `boolean`     | `false`                  | Fire the callback once on mount with the current value (still filtered) |

### Event Filters

The filter factories are exported alongside the hook — `debounceFilter(ms)`
and `throttleFilter(ms)` — mirroring upstream's filter semantics:

```tsx
import { debounceFilter, throttleFilter, useWatchWithFilter } from '@reause/shared'

// Debounce: bursts of changes collapse into one call 100ms after the last change,
// forced by maxWait when changes never settle
useWatchWithFilter(input, callback, { eventFilter: debounceFilter(100, { maxWait: 500 }) })

// Throttle: at most one call per 100ms window (leading + trailing edges by default)
useWatchWithFilter(scrollY, callback, { eventFilter: throttleFilter(100) })
```

### Stopping the watcher

```tsx
import { debounceFilter, useWatchWithFilter } from '@reause/shared'

const stop = useWatchWithFilter(source, callback, { eventFilter: debounceFilter(100) })

// further changes — and any pending filtered invocation — won't fire the callback
stop()
```

Fire the callback once on mount with the current value (still filtered):

```tsx
import { useWatchWithFilter } from '@reause/shared'

useWatchWithFilter(input, () => console.log('changed!'), { immediate: true })
```

## Type Declarations

```ts
/**
 * Filter for if events should to be received — the house equivalent of upstream's `EventFilter`
 * (`@vueuse/shared` `utils/filters.ts`).
 *
 * Upstream is generic over the wrapped function (`EventFilter<Args, This, Invoke>` returning
 * `ReturnType<Invoke> | Promisify<ReturnType<Invoke>>`); the watch path discards the wrapped
 * callback's return value, so the contract collapses to `(invoke: FunctionArgs, options?:
 * Record<string, unknown>) => void`. The optional second argument.g. `useMouse` passes `{}`), so a
 * chained filter reads an object instead of `undefined`.
 */
export type EventFilter = (
  invoke: FunctionArgs,
  options?: Record<string, unknown>,
) => void
/**
 * An `EventFilter` that carries cancellation controls, as returned by `debounceFilter`.
 *
 * `isPending` is a plain (non-reactive) getter — React has no reactive refs, read it imperatively.
 */
export interface CancelableEventFilter extends EventFilter {
  cancel: () => void
  flush: () => void
  readonly isPending: boolean
}
export interface UseWatchWithFilterOptions {
  /**
   * Filter for if events should to be received.
   *
   * The filter instance is captured once on mount — like upstream, where the watch options are
   * evaluated once during setup — so an inline `debounceFilter(300)` is safe; pass a getter-based
   * delay (`debounceFilter(() => ms)`) when the delay must change over time.
   *
   * @default bypassFilter (invoke directly)
   */
  eventFilter?: EventFilter
  /**
   * Fire the callback once on mount with the current value (still filtered).
   * @default false
   */
  immediate?: boolean
}
/**
 * The stop function returned by `useWatchWithFilter` — upstream's `WatchHandle`, reduced to the
 * stop capability (house `useWatch` has no stop-handle infrastructure).
 */
export type UseWatchWithFilterReturn = () => void
/**
 * Create an EventFilter that debounce the events — in-house port of upstream `@vueuse/shared`
 * `debounceFilter` (trailing edge + `maxWait`).
 *
 * Mapping: same collapsing semantics as upstream (a newer call supersedes the pending one; the
 * `maxWait` timer survives re-scheduling and forces the call with the latest `invoke`).
 * Divergences: the promise-settlement plumbing (`lastRejector` / `rejectOnCancel`) is dropped — the
 * house `EventFilter` contract returns `void` and the watch path consumes no promise, so
 * `rejectOnCancel` has no observable effect — and `isPending` is a plain getter instead of a
 * reactive ref. `ms` is a plain number, re-read on every call. Pending timers are cleared by
 * `cancel()` — the `useWatchWithFilter` hook calls it on stop / unmount.
 *
 * @example
 * ```ts
 * useWatchWithFilter(input, callback, { eventFilter: debounceFilter(300, { maxWait: 1000 }) })
 * ```
 */
export declare function debounceFilter(
  ms?: number,
  options?: DebounceFilterOptions,
): CancelableEventFilter
/**
 * Create an EventFilter that throttle the events — in-house port of upstream `@vueuse/shared`
 * `throttleFilter` (leading/trailing edges with a trailing invoke on window end).
 *
 * Mapping: same collapsing semantics as upstream — a call inside the throttle window re-schedules
 * the trailing timer with the remaining time, collapsing bursts into one trailing call carrying the
 * latest `invoke`. Divergences: the promise-settlement plumbing (`rejectOnCancel`, upstream's
 * fourth parameter) is dropped — the house `EventFilter` contract returns `void` — and the object
 * options form is not ported (positional `throttleFilter(ms, trailing, leading)` like the house
 * `useThrottleFn`). `ms` is a plain number, re-read on every call.
 *
 * @example
 * ```ts
 * useWatchWithFilter(scrollY, callback, { eventFilter: throttleFilter(100, true, false) })
 * ```
 */
export declare function throttleFilter(
  ms?: number,
  trailing?: boolean,
  leading?: boolean,
): EventFilter
export declare function useWatchWithFilter<T extends any[]>(
  source: readonly [...T],
  callback: UseWatchCallback<[...T]>,
  options?: UseWatchWithFilterOptions,
): UseWatchWithFilterReturn
export declare function useWatchWithFilter<T>(
  source: T,
  callback: UseWatchCallback<T>,
  options?: UseWatchWithFilterOptions,
): UseWatchWithFilterReturn
```
