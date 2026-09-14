---
category: Side-effects
---

# useMemoizedFn

Keep a function's identity stable while always calling its latest implementation.

## Usage

```tsx
import { useMemoizedFn } from '@reause/shared'

const [count, setCount] = useState(0)

// no deps array: the identity never changes, the body always reads `count`
const show = useMemoizedFn(() => console.log(count))
```

Passing `show` to a memoised child keeps that child from re-rendering when `count` changes — the reason to reach for it over `useCallback`, whose identity follows its deps.

`useLatest` covers adjacent ground differently: it tracks a value and hands back a ref, while this hook hands back a stable callable. react-use's `useEvent` is the closest upstream equivalent of that callable form.

## Type Declarations

```ts
type noop = (this: any, ...args: any[]) => any
type PickFunction<T extends noop> = (
  this: ThisParameterType<T>,
  ...args: Parameters<T>
) => ReturnType<T>
/**
 * Map from ahooks `useMemoizedFn`.
 * (`source/ahooks/packages/hooks/src/useMemoizedFn/`).
 *
 * Returns a function whose identity never changes, while the body it calls is
 * always the latest `fn` — so it can stand in for `useCallback` without a
 * dependency array, which is what a memoised child needs to skip re-rendering
 * while still calling back into the newest render's closure.
 *
 * `useLatest` covers adjacent ground differently: it tracks a value and hands
 * back a ref, whereas this hook hands back a stable callable. react-use's
 * `useEvent` is the closest upstream equivalent of that callable form; this
 * port keeps ahooks' signature, including the `this` forwarding.
 *
 * @param fn The function to keep calling. The returned wrapper reads the latest
 * `fn` on every call, so it never runs a stale closure.
 * @returns A stable callable with `fn`'s parameters, `this` type and return
 * type. It is a different reference from `fn` and does not inherit properties
 * set on `fn` itself (upstream FAQ, alibaba/hooks#2273).
 *
 * @example
 * const [count, setCount] = useState(0)
 *
 * // no deps array, and the identity never changes
 * const show = useMemoizedFn(() => console.log(count))
 *
 * // in a memoised child this never re-renders when `count` changes
 * <ExpensiveTree onShow={show} />
 */
export declare function useMemoizedFn<T extends noop>(fn: T): PickFunction<T>
```
