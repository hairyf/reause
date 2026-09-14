---
category: Watch
---

# useWatchThrottled

Throttled watch. The callback will be invoked at most once per specified duration

## Usage

Similar to `useWatch`, but offering extra options `throttle`, `trailing`, and
`leading` which will be applied to the callback function.

```tsx
import { useWatchThrottled } from '@reause/shared'

useWatchThrottled(
  input,
  () => { console.log('changed!') },
  { throttle: 500 },
)
```

### Options

| Option      | Type      | Default | Description                                                              |
| ----------- | --------- | ------- | ------------------------------------------------------------------------ |
| `throttle`  | `number`  | `0`     | Throttle interval in ms                                                  |
| `trailing`  | `boolean` | `true`  | Invoke on the trailing edge                                              |
| `leading`   | `boolean` | `true`  | Invoke on the leading edge                                               |
| `immediate` | `boolean` | `false` | Fire the callback once on mount with the current value (still throttled) |

### Leading and Trailing

Control when the callback is invoked:

```tsx
import { useWatchThrottled } from '@reause/shared'

// Only invoke at the start of each throttle period
useWatchThrottled(source, callback, {
  throttle: 500,
  leading: true,
  trailing: false,
})

// Only invoke at the end of each throttle period
useWatchThrottled(source, callback, {
  throttle: 500,
  leading: false,
  trailing: true,
})
```

Fire the callback once on mount with the current value (still throttled):

```tsx
import { useWatchThrottled } from '@reause/shared'

useWatchThrottled(input, () => console.log('changed!'), { immediate: true })
```

## Type Declarations

```ts
export interface UseWatchThrottledOptions {
  /**
   * Throttle interval in milliseconds — a plain number, re-read on every source change.
   *
   * @default 0
   */
  throttle?: number
  /**
   * Invoke the callback on the trailing edge of the throttle window.
   *
   * @default true
   */
  trailing?: boolean
  /**
   * Invoke the callback on the leading edge of the throttle window.
   *
   * @default true
   */
  leading?: boolean
  /**
   * Fire the callback once on mount with the current value (still throttled).
   *
   * @default false
   */
  immediate?: boolean
}
/**
 * Map from @vueuse/shared `watchThrottled`.
 *
 * @example
 * ```ts
 * useWatchThrottled(input, (value, oldValue) => console.log(value, oldValue), { throttle: 500 })
 * useWatchThrottled([count, name], (value, oldValue) => console.log(value, oldValue), { throttle: 200 })
 * ```
 */
export declare function useWatchThrottled<T extends any[]>(
  source: readonly [...T],
  callback: UseWatchCallback<[...T]>,
  options?: UseWatchThrottledOptions,
): void
export declare function useWatchThrottled<T>(
  source: T,
  callback: UseWatchCallback<T>,
  options?: UseWatchThrottledOptions,
): void
```
