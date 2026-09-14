---
category: Utilities
---

# useThrottleFn

Throttle execution of a function

## Usage

```tsx
import { useThrottleFn } from '@reause/shared'
import { useEffect } from 'react'

const throttledFn = useThrottleFn(() => {
  // do something, it will be called at most 1 time per second
}, 1000)

useEffect(() => {
  window.addEventListener('resize', throttledFn)
  return () => window.removeEventListener('resize', throttledFn)
}, [throttledFn])
// note: returned fn is referentially stable so effects don't re-subscribe;
// ms is a plain number, re-read on
// every call
```

## Recommended Reading

- [**Debounce vs Throttle**: Definitive Visual Guide](https://kettanaito.com/blog/debounce-vs-throttle)

## Type Declarations

```ts
export type PromisifyFn<T extends FunctionArgs> = (
  ...args: Parameters<T>
) => Promise<Awaited<ReturnType<T>>>
/**
 * Throttle execution of a function — React port of VueUse's `useThrottleFn`.
 * Especially useful for rate limiting execution of handlers on events like
 * resize and scroll.
 *
 * Map from @vueuse/shared `useThrottleFn`
 * Mapping: upstream builds `createFilterWrapper(throttleFilter(ms, trailing,
 * leading, rejectOnCancel), fn)` and returns a plain `PromisifyFn<T>` — the
 * throttled wrapper carries no `cancel` / `flush` / `isPending` (unlike the
 * debounce filter, upstream's `throttleFilter` is not cancelable), so this
 * port mirrors that: the return value is the wrapped function and nothing
 * more. The wrapper is built once (`useMemo`) so its identity is stable
 * across renders — safe to add/remove in effects; the latest `fn` / `ms` /
 * `trailing` / `leading` / `rejectOnCancel` are mirrored into refs so every
 * call sees fresh values (upstream captures the flags once, at filter
 * creation). `ms` is a plain number, re-read on every call (upstream:
 * `MaybeRefOrGetter<number>`). The
 * throttle filter logic is inlined (upstream: `utils/filters.ts`
 * `throttleFilter` — leading/trailing timestamps with a trailing invoke on
 * window end). The wrapper is cleaned up on unmount: any pending trailing
 * timer is cleared when the component unmounts — a React hygiene measure;
 * upstream registers no disposal at all (`@__NO_SIDE_EFFECTS__`), so a
 * pending call would still fire there after teardown.
 *
 * @param   fn             A function to be executed after delay milliseconds. The `this` context and all arguments are passed through, as-is,
 *                                    to `callback` when the throttled-function is executed.
 * @param   ms             A zero-or-greater delay in milliseconds. For event callbacks, values around 100 or 250 (or even higher) are most useful.
 *                                    (default value: 200)
 *
 * @param [trailing] if true, call fn again after the time is up (default value: true)
 *
 * @param [leading] if true, call fn on the leading edge of the ms timeout (default value: true)
 *
 * @param [rejectOnCancel] if true, reject the last call if it's been cancel (default value: false)
 *
 * @return  A new, throttled, function.
 *
 * @example
 * const throttledFn = useThrottleFn(() => { ... }, 1000)
 * throttledFn()
 */
export declare function useThrottleFn<T extends FunctionArgs>(
  fn: T,
  ms?: number,
  trailing?: boolean,
  leading?: boolean,
  rejectOnCancel?: boolean,
): PromisifyFn<T>
```
