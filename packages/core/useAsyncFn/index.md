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
