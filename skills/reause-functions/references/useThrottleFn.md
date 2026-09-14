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
 * Map from @vueuse/shared `useThrottleFn`.
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
