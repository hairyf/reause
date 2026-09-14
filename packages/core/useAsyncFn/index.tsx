import { useLatest } from '@reause/shared'
import { useRef, useState } from 'react'
import { useMounted } from '../useMounted'

/**
 * `PromiseType` / `FunctionReturningPromise` — mapped from
 * `source/react-use/src/misc/types.ts`. Upstream keeps the helpers in its
 * `misc/types` module and `useAsyncFn` itself re-exports neither; reause has no `misc` module, so
 * they are declared next to the hook that uses them and stay module-private (the exported surface
 * is `AsyncState` / `AsyncFnReturn`, exactly as upstream).
 */
type PromiseType<P extends Promise<any>> = P extends Promise<infer T> ? T : never

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
export type AsyncState<T>
  = | {
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

type StateFromFunctionReturningPromise<T extends FunctionReturningPromise> = AsyncState<
  PromiseType<ReturnType<T>>
>

/**
 * The `[state, callback]` tuple `useAsyncFn` returns — mirrored from
 * `source/react-use/src/useAsyncFn.ts` (public API). The callback keeps the
 * wrapped function's own parameter and return types, so `await`ing it yields the raw promise
 * result.
 */
export type AsyncFnReturn<T extends FunctionReturningPromise = FunctionReturningPromise> = [
  StateFromFunctionReturningPromise<T>,
  T,
]

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
export function useAsyncFn<T extends FunctionReturningPromise>(
  fn: T,
  initialState: StateFromFunctionReturningPromise<T> = { loading: false },
): AsyncFnReturn<T> {
  const lastCallId = useRef(0)
  const isMounted = useMounted()
  // `useMounted()` returns the mounted boolean of the render that called it;
  // the memoised callback outlives that render, so it is read through the
  // stable ref `useLatest` hands back (upstream's `useMountedState()` returns a
  // getter that reads its ref in the same way).
  const isMountedRef = useLatest(isMounted)
  const [state, set] = useState<StateFromFunctionReturningPromise<T>>(initialState)
  const callback = (...args: Parameters<T>): ReturnType<T> => {
    const callId = ++lastCallId.current

    if (!state.loading)
      set(prevState => ({ ...prevState, loading: true }))

    return fn(...args).then(
      (value) => {
        if (isMountedRef.current && callId === lastCallId.current)
          set({ value, loading: false })

        return value
      },
      (error) => {
        if (isMountedRef.current && callId === lastCallId.current)
          set({ error, loading: false })

        // upstream deliberately resolves with the error instead of rejecting
        return error
      },
    ) as ReturnType<T>
  }

  return [state, callback as unknown as T]
}
