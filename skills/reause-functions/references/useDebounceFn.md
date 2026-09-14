---
category: Utilities
related: useThrottleFn
---

# useDebounceFn

Debounce execution of a function.

> Debounce is an overloaded waiter: if you keep asking, your requests will be ignored until you stop and give them some time to think about your latest inquiry.

## Usage

```tsx
import { useDebounceFn } from '@reause/shared'

const debouncedFn = useDebounceFn(() => {
  // do something
}, 1000)
```

You can also pass a 3rd parameter to this, with a maximum wait time, similar to [lodash debounce](https://lodash.com/docs/4.17.15#debounce)

```tsx
import { useDebounceFn } from '@reause/shared'

// If no invocation after 5000ms due to repeated input,
// the function will be called anyway.
const debouncedFn = useDebounceFn(() => {
  // do something
}, 1000, { maxWait: 5000 })
```

Optionally, you can get the return value of the function using promise operations.

```tsx
import { useDebounceFn } from '@reause/shared'

const debouncedFn = useDebounceFn(() => 'response', 1000)

debouncedFn().then((value) => {
  console.log(value) // 'response'
})

// or use async/await
async function doRequest() {
  const value = await debouncedFn()
  console.log(value) // 'response'
}
```

Since unhandled rejection error is quite annoying when developer doesn't need the return value, the promise will **NOT** be rejected if the function is canceled **by default**. You need to specify the option `rejectOnCancel: true` to capture the rejection.

```tsx
import { useDebounceFn } from '@reause/shared'

const debouncedFn = useDebounceFn(() => 'response', 1000, { rejectOnCancel: true })

debouncedFn()
  .then((value) => {
    // do something
  })
  .catch(() => {
    // do something when canceled
  })

// calling it again will cancel the previous request and gets rejected
setTimeout(debouncedFn, 500)
```

## Cancel

You can cancel any pending execution by calling the `cancel` method.

```tsx
import { useDebounceFn } from '@reause/shared'

const debouncedFn = useDebounceFn(() => {
  // do something
}, 1000)

debouncedFn()

// Cancel the pending execution before it runs
debouncedFn.cancel()
```

This is useful when you need to prevent the debounced function from executing, for example, when a component is unmounted or when user input changes context.

## Pending State

You can check if there's a pending execution using the `isPending` getter.

```tsx
import { useDebounceFn } from '@reause/shared'

const debouncedFn = useDebounceFn(() => {
  // do something
}, 1000)

debouncedFn()
console.log(debouncedFn.isPending) // true

// After debounce time elapses or cancel is called
console.log(debouncedFn.isPending) // false
```

This is useful for showing loading indicators or disabling UI elements while waiting for the debounced function to execute.

## Flush

You can immediately execute the pending invocation using the `flush` method.

```tsx
import { useDebounceFn } from '@reause/shared'

const debouncedFn = useDebounceFn(() => {
  // do something
}, 1000)

debouncedFn()

// Execute the pending invocation immediately instead of waiting
debouncedFn.flush()
```

This is useful when you need to ensure the debounced function runs right away, for example, before navigating away from a page or submitting a form.

## Recommended Reading

- [**Debounce vs Throttle**: Definitive Visual Guide](https://kettanaito.com/blog/debounce-vs-throttle)

## Type Declarations

```ts
export type FunctionArgs<Args extends any[] = any[], Return = unknown> = (
  ...args: Args
) => Return
export interface DebounceFilterOptions {
  /**
   * The maximum time allowed to be delayed before it's invoked.
   * In milliseconds.
   */
  maxWait?: number
  /**
   * Whether to reject the last call if it's been cancelled.
   *
   * @default false
   */
  rejectOnCancel?: boolean
}
export interface UseDebounceFnReturn<T extends FunctionArgs> {
  (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>>
  /**
   * Cancel the pending invocation — the outstanding promise settles
   * (resolves, or rejects with `rejectOnCancel`) without calling `fn`.
   */
  cancel: () => void
  /**
   * Invoke the pending call immediately and settle its promise with the result.
   */
  flush: () => void
  /**
   * `true` while a call is waiting to be invoked.
   *
   * Note: unlike upstream's reactive readonly ref, this is a plain
   * (non-reactive) getter — read it imperatively, it does not trigger
   * re-renders.
   */
  readonly isPending: boolean
}
/**
 * Debounce execution of a function — React port of VueUse's `useDebounceFn`.
 *
 * Map from @vueuse/shared `useDebounceFn`
 * Mapping: upstream builds `createFilterWrapper(debounceFilter(ms, options), fn)`
 * so every call returns a promise and the wrapper carries `cancel` / `flush` /
 * `isPending`. This port builds the same wrapper once (`useMemo`) so its
 * identity is stable across renders; the latest `fn` / `ms` / `options` are
 * mirrored into refs so every call sees fresh values. `ms` is a plain number,
 * re-read on every call (upstream: `MaybeRefOrGetter<number>`). `isPending`
 * becomes a non-reactive getter (React has no reactive
 * refs); promise settlement mirrors upstream — a regular debounce resolves
 * with the result, a superseded/canceled call settles with `undefined` (or
 * rejects with `rejectOnCancel`), and the `maxWait` trailing edge runs the
 * latest invocation but settles the pending promise without its result.
 * Pending timers are cleared when the component unmounts (upstream leaves
 * disposal to the effect scope).
 *
 * @example
 * const debouncedFn = useDebounceFn(() => { ... }, 1000)
 * debouncedFn()
 * debouncedFn.cancel()
 * debouncedFn.flush()
 */
export declare function useDebounceFn<T extends FunctionArgs>(
  fn: T,
  ms?: number,
  options?: DebounceFilterOptions,
): UseDebounceFnReturn<T>
```
