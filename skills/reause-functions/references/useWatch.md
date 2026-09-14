---
category: Watch
---

# useWatch

Watches a source — a single value or an array of values — and invokes a callback with `(value, oldValue)` whenever it changes

## Usage

```tsx
import { useWatch } from '@reause/shared'

useWatch(count, (value, oldValue) => {
  console.log(value, oldValue)
})

// array source — fires when any element changes
useWatch([count, name], (value, oldValue) => {
  console.log(value, oldValue)
})
```

## Options

| Name        | Type      | Default | Description                                            |
| ----------- | --------- | ------- | ------------------------------------------------------ |
| `immediate` | `boolean` | `false` | Fire the callback once on mount with the current value |

With `immediate: true` the callback fires on mount with `(value, undefined)`,
then with `(value, oldValue)` on every subsequent change:

```tsx
useWatch(count, (value, oldValue) => {
  console.log(value, oldValue) // (0, undefined) on mount, then (1, 0), ...
}, { immediate: true })
```

## Type Declarations

```ts
export interface UseWatchCallback<T = any> {
  (value: T, oldValue: T | undefined): void
}
export interface UseWatchOptions {
  /**
   * Fire the callback once on mount with the current value.
   * @default false
   */
  immediate?: boolean
}
/**
 * Map from @vueuse/shared `watch`.
 *
 * @example
 * ```ts
 * useWatch(count, (value, oldValue) => console.log(value, oldValue))
 * useWatch([count, name], (value, oldValue) => console.log(value, oldValue))
 * ```
 */
export declare function useWatch<T extends any[]>(
  source: readonly [...T],
  callback: UseWatchCallback<[...T]>,
  options?: UseWatchOptions,
): void
export declare function useWatch<T>(
  source: T,
  callback: UseWatchCallback<T>,
  options?: UseWatchOptions,
): void
```
