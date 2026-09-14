import { useMemo, useRef } from 'react'

type noop = (this: any, ...args: any[]) => any

type PickFunction<T extends noop> = (
  this: ThisParameterType<T>,
  ...args: Parameters<T>
) => ReturnType<T>

// `isDev` is declared here, locally, because @reause/shared has no dev helper
// yet. Upstream keeps it in `source/ahooks/packages/hooks/src/utils/isDev.ts`;
// the expression is upstream's verbatim.
// eslint-disable-next-line node/prefer-global/process -- browser package: `node:process` is not bundled; the gate relies on the bundler replacing `process.env.NODE_ENV` with a literal at build time (the assumption React's own source makes) and this repo configures no `process` shim, so the replacement is what keeps the reference safe AND keeps the error live in a browser dev build
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

/** Upstream's `isFunction` (`source/ahooks/packages/hooks/src/utils/index.ts`), kept local for the same reason as `isDev`. */
function isFunction(value: unknown): value is noop {
  return typeof value === 'function'
}

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
export function useMemoizedFn<T extends noop>(fn: T): PickFunction<T> {
  if (isDev) {
    if (!isFunction(fn)) {
      console.error(`useMemoizedFn expected parameter is a function, got ${typeof fn}`)
    }
  }

  const fnRef = useRef<T>(fn)

  // why not write `fnRef.current = fn`?
  // https://github.com/alibaba/hooks/issues/728
  fnRef.current = useMemo<T>(() => fn, [fn])

  const memoizedFn = useRef<PickFunction<T>>(undefined)

  if (!memoizedFn.current) {
    memoizedFn.current = function (this, ...args) {
      return fnRef.current.apply(this, args)
    }
  }

  return memoizedFn.current
}
