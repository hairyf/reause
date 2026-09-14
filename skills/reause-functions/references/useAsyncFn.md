---
category: State
---

# useAsyncFn

Returns state and a callback for an `async` function (or any function returning a promise).

## Usage

```tsx
import { useAsyncFn } from '@reause/core'

const [state, doFetch] = useAsyncFn(async (id: string) => {
  const response = await fetch(`/api/item/${id}`)
  return response.json()
})

// state: { loading: true } | { loading: false, value } | { loading: false, error }
return (
  <div>
    {state.loading
      ? <div>Loading…</div>
      : state.error
        ? (
            <div>
              Error:
              {state.error.message}
            </div>
          )
        : (
            <div>
              Value:
              {String(state.value)}
            </div>
          )}
    <button type="button" onClick={() => doFetch('42')}>Fetch</button>
  </div>
)
```

`doFetch` returns the raw promise, so it can be awaited directly. A failure is not thrown: the error branch **resolves with the error** and stores it in `state.error`, so `await doFetch()` never rejects — read `state.error` to detect failures.

`deps` is not supported: the hook takes only the async function and an optional `initialState`. The callback is re-created on every render, so it always reads the latest `fn` and state — which also means its identity is not stable and it must not go into a dependency array.

```tsx
const [state, search] = useAsyncFn(async () => query(filters))
```

Calls are race-guarded: only the newest call may write state, so a slow response arriving after a newer one is discarded.

## Type Declarations

```ts
/**
 * `PromiseType` / `FunctionReturningPromise` — mapped from
 * `source/react-use/src/misc/types.ts`. Upstream keeps the helpers in its
 * `misc/types` module and `useAsyncFn` itself re-exports neither; reause has no `misc` module, so
 * they are declared next to the hook that uses them and stay module-private (the exported surface
 * is `AsyncState` / `AsyncFnReturn`, exactly as upstream).
 */
type PromiseType<P extends Promise<any>> =
  P extends Promise<infer T> ? T : never
type FunctionReturningPromise = (...args: any[]) => Promise<any>
/**
 * The state machine of an async callback call — mirrored from
 * `source/react-use/src/useAsyncFn.ts` unchanged (public API, not an
 * implementation detail).
 *
 * - `{ loading: true }` — a call is in flight (`error` may carry the previous
 *   failure, `value` the previous result);
 * - `{ loading: false, value }` — the last call resolved;
 * - `{ loading: false, error }` — the last call rejected; the error is stored
 *   as **state**, it is never re-thrown (see `useAsyncFn`);
 * - `{ loading: boolean }` — the neutral/initial shape.
 */
export type AsyncState<T> =
  | {
      loading: boolean
      error?: undefined
      value?: undefined
    }
  | {
      loading: true
      error?: Error | undefined
      value?: T
    }
  | {
      loading: false
      error: Error
      value?: undefined
    }
  | {
      loading: false
      error?: undefined
      value: T
    }
type StateFromFunctionReturningPromise<T extends FunctionReturningPromise> =
  AsyncState<PromiseType<ReturnType<T>>>
/**
 * The `[state, callback]` tuple `useAsyncFn` returns — mirrored from
 * `source/react-use/src/useAsyncFn.ts` (public API). The callback keeps the
 * wrapped function's own parameter and return types, so `await`ing it yields the raw promise
 * result.
 */
export type AsyncFnReturn<
  T extends FunctionReturningPromise = FunctionReturningPromise,
> = [StateFromFunctionReturningPromise<T>, T]
/**
 * Map from react-use `useAsyncFn`
 * (`source/react-use/src/useAsyncFn.ts`).
 *
 * Deviation from upstream: `deps` is not supported, and the reause-only
 * `options.deep` extension that once replaced it is gone as well — the hook
 * takes only `fn` and an optional `initialState`. The callback is therefore a
 * fresh function on every render rather than a memoised one: it always reads
 * the latest `fn` and state, at the cost of a new identity per render, so it
 * must not be used as a dependency of `useMemo` / `useCallback` / `useEffect`.
 *
 * @example
 * const [state, doFetch] = useAsyncFn(async (id: string) => {
 *   const response = await fetch(`/api/item/${id}`)
 *   return response.json()
 * })
 *
 * // state: { loading: true } | { loading: false, value } | { loading: false, error }
 * const value = await doFetch('42') // the raw promise is returned
 *
 * @example
 * // the state before the first call can be seeded
 * const [state, search] = useAsyncFn(async () => query(filters), { loading: false })
 *
 * @param fn The async function (or promise-returning function) to wrap.
 * @param initialState The state before the first call. Defaults to
 * `{ loading: false }` (upstream default).
 * @returns The `[state, callback]` tuple — `state` is the `AsyncState` union
 * and `callback` the async wrapper that also returns the raw promise.
 * @see https://github.com/streamich/react-use/blob/master/docs/useAsyncFn.md
 */
export declare function useAsyncFn<T extends FunctionReturningPromise>(
  fn: T,
  initialState?: StateFromFunctionReturningPromise<T>,
): AsyncFnReturn<T>
```
