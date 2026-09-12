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
