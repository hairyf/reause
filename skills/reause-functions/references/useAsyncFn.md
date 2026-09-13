---
category: Side-effects
---

# useAsyncFn

Returns state and a callback for an `async` function (or any function returning a promise) — React port of react-use's [`useAsyncFn`](https://github.com/streamich/react-use/blob/master/docs/useAsyncFn.md) (upstream mapping files: `source/react-use/src/useAsyncFn.ts`, 67 LOC, and the `PromiseType` / `FunctionReturningPromise` helpers in `source/react-use/src/misc/types.ts`). `state` is the `AsyncState` union — `{ loading: true }` while a call is in flight, then `{ loading: false, value }` or `{ loading: false, error }` — and `callback` is memoised per `deps` and returns the raw promise.

This hook is the **imperative** half of the async trio: it drives the async function and reports that call's state machine. `useAsync` is a derived value re-evaluated from its inputs and `useAsyncState` is an `execute()` shell around a promise; both stay `execute()`-based and separate, so react-use users keep the API they know.

## Usage

```tsx
import { useAsyncFn } from '@reause/core'

const [state, doFetch] = useAsyncFn(async (id: string) => {
  const response = await fetch(`/api/item/${id}`)
  return response.json()
}, [])

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

`deps` decides the callback identity and is compared by reference, exactly as upstream. Pass `{ deep: true }` as the fourth argument to compare `deps` structurally instead, so an equal-but-new array or object no longer re-memoises the callback:

```tsx
const [state, search] = useAsyncFn(
  async () => query(filters),
  [filters], // a new-but-equal `filters` object re-memoises by default
  { loading: false },
  { deep: true },
)
```

Calls are race-guarded: only the newest call may write state, so a slow response arriving after a newer one is discarded.

## Type Declarations

```ts
/**
 * `PromiseType` / `FunctionReturningPromise` — mapped from
 * `source/react-use/src/misc/types.ts`. Upstream keeps the helpers in its
 * `misc/types` module and `useAsyncFn` itself re-exports neither; reause has no
 * `misc` module, so they are declared next to the hook that uses them and stay
 * module-private (the exported surface is `AsyncState` / `AsyncFnReturn`,
 * exactly as upstream).
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
 * wrapped function's own parameter and return types, so `await`ing it yields
 * the raw promise result.
 */
export type AsyncFnReturn<
  T extends FunctionReturningPromise = FunctionReturningPromise,
> = [StateFromFunctionReturningPromise<T>, T]
/**
 * reause-only options — an owner-requested, strictly opt-in extension to
 * upstream's positional signature.
 */
export interface UseAsyncFnOptions {
  /**
   * Compare `deps` structurally (`@reause/shared`'s `deepEqual`, covering
   * arrays, plain objects, `Date`, `RegExp`, `Map` and `Set`) instead of
   * element-wise reference equality.
   *
   * The default is `false`: reference-based comparison is kept so upstream
   * react-use behaviour is unchanged, and `deep: true` is always the caller's
   * explicit choice.
   *
   * @default false
   */
  deep?: boolean
}
/**
 * React hook that returns state and a callback for an `async` function or a
 * function that returns a promise.
 *
 * Map from react-use `useAsyncFn`
 * (`source/react-use/src/useAsyncFn.ts`, 67 LOC; the `PromiseType` /
 * `FunctionReturningPromise` helpers come from
 * `source/react-use/src/misc/types.ts`, and the upstream docs page is
 * `docs/useAsyncFn.md`). Mirrored 1:1: the positional signature
 * (`fn`, `deps`, `initialState`), the `[state, callback]` tuple and the
 * `AsyncState` / `AsyncFnReturn` types are upstream's, and `callback` is
 * memoised per `deps` (upstream passes `deps` straight to `useCallback`).
 *
 * This hook is the **imperative** half of the async trio, not a variant of the
 * other two: it *drives* an async function and exposes that call's state
 * machine. The VueUse-derived `useAsync` is a derived value re-evaluated from
 * its inputs, and `useAsyncState` is an `execute()` shell around a promise;
 * both stay `execute()`-based and separate. `useAsyncFn` is kept as the
 * react-use mirror rather than folded into either, so react-use users get the
 * API they know.
 *
 * Invoking `callback(...)`:
 *
 * - flips the state to `{ ...prev, loading: true }` (only when it is not
 *   already loading, upstream's guard) and returns the **raw promise** — the
 *   result of `fn(...args)`, so callers can `await` it;
 * - on resolution stores `{ value, loading: false }` and resolves with
 *   `value`;
 * - on rejection stores `{ error, loading: false }` and **resolves with the
 *   error** instead of rejecting (`return error` from the rejection handler is
 *   upstream's deliberate behaviour, kept here). `await callback()` therefore
 *   never throws; read `state.error` to detect failures;
 * - only the newest call may write state: a monotonically increasing
 *   `lastCallId` ref discards the response of any call superseded by a later
 *   one, so a slow call #1 that resolves after call #2 cannot overwrite call
 *   #2's result. The write is additionally gated on the mount check.
 *
 * Mount guard: upstream uses react-use's `useMountedState()`, which returns a
 * getter reading a ref that flips to `false` on unmount. reause uses
 * **`useMounted` from `@reause/core`** (the VueUse port) and bridges its
 * boolean into the memoised callback through `useLatest` — the callback is
 * created once per `deps` and outlives the render that created it, so reading
 * the boolean directly would freeze it at its first-render value (`false`).
 * `useMounted` never flips back on unmount, so the guard protects against
 * callbacks invoked before the mount effect has run, while the `lastCallId`
 * ref is what actually stops a stale response from winning. (It is deliberately
 * not the sibling `useUnmountedRef` from this batch — see the PR.)
 *
 * `options.deep` (reause-only, opt-in): `deep: true` compares `deps`
 * structurally, so an equal-but-new reference (a freshly built array or
 * object) no longer re-memoises the callback. The default remains
 * reference-based, i.e. upstream behaviour.
 *
 * `fn` itself is captured when the callback is created, exactly like
 * upstream's `useCallback(…, deps)` closure: if the function identity changes
 * without the listed `deps` changing, list it in `deps` or the callback keeps
 * calling the older one.
 *
 * @example
 * const [state, doFetch] = useAsyncFn(async (id: string) => {
 *   const response = await fetch(`/api/item/${id}`)
 *   return response.json()
 * }, [])
 *
 * // state: { loading: true } | { loading: false, value } | { loading: false, error }
 * const value = await doFetch('42') // the raw promise is returned
 *
 * @example
 * // opt-in deep comparison — an equal-but-new `filters` object keeps the
 * // callback (and therefore does not invalidate memos that depend on it)
 * const [state, search] = useAsyncFn(
 *   async () => query(filters),
 *   [filters],
 *   { loading: false },
 *   { deep: true },
 * )
 *
 * @param fn The async function (or promise-returning function) to wrap.
 * @param deps Dependency list deciding the callback's identity. Defaults to
 * `[]` (the callback is created once).
 * @param initialState The state before the first call. Defaults to
 * `{ loading: false }` (upstream default).
 * @param options reause-only options; `deep` opts into structural `deps`
 * comparison. Omit it for exact upstream behaviour.
 * @returns The `[state, callback]` tuple — `state` is the `AsyncState` union
 * and `callback` the memoised async wrapper that also returns the raw promise.
 * @see https://github.com/streamich/react-use/blob/master/docs/useAsyncFn.md
 */
export declare function useAsyncFn<T extends FunctionReturningPromise>(
  fn: T,
  deps?: DependencyList,
  initialState?: StateFromFunctionReturningPromise<T>,
  options?: UseAsyncFnOptions,
): AsyncFnReturn<T>
```
