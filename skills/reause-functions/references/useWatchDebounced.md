---
category: Watch
---

# useWatchDebounced

Debounced watch. The callback will only be invoked after the source stops changing for the specified duration

## Usage

Similar to `useWatch`, but offering extra options `debounce` and `maxWait` which will
be applied to the callback function.

```tsx
import { useWatchDebounced } from '@reause/shared'

useWatchDebounced(
  input,
  () => { console.log('changed!') },
  { debounce: 500, maxWait: 1000 },
)
```

### Options

| Option      | Type      | Default | Description                                                              |
| ----------- | --------- | ------- | ------------------------------------------------------------------------ |
| `debounce`  | `number`  | `0`     | Debounce delay in ms                                                     |
| `maxWait`   | `number`  | —       | Maximum wait time before forced invocation                               |
| `immediate` | `boolean` | `false` | Fire the callback once on mount with the current value (still debounced) |

Fire the callback once on mount with the current value (still debounced):

```tsx
import { useWatchDebounced } from '@reause/shared'

useWatchDebounced(input, () => console.log('changed!'), { immediate: true })
```

## Type Declarations

```ts
export interface UseWatchDebouncedOptions extends DebounceFilterOptions {
  /**
   * Debounce delay in milliseconds — a plain number, re-read on every source change.
   *
   * @default 0
   */
  debounce?: number
  /**
   * Fire the callback once on mount with the current value (still debounced).
   *
   * @default false
   */
  immediate?: boolean
}
/**
 * Map from @vueuse/shared `watchDebounced`.
 *
 * @example
 * ```ts
 * useWatchDebounced(input, (value, oldValue) => console.log(value, oldValue), { debounce: 500, maxWait: 1000 })
 * useWatchDebounced([count, name], (value, oldValue) => console.log(value, oldValue), { debounce: 200 })
 * ```
 */
export declare function useWatchDebounced<T extends any[]>(
  source: readonly [...T],
  callback: UseWatchCallback<[...T]>,
  options?: UseWatchDebouncedOptions,
): void
export declare function useWatchDebounced<T>(
  source: T,
  callback: UseWatchCallback<T>,
  options?: UseWatchDebouncedOptions,
): void
```
