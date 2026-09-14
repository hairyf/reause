---
category: Side-effects
---

# useLockFn

Add a lock to an async function so overlapping calls are dropped rather than run in parallel — React port of ahooks' `useLockFn`.

## Usage

```tsx
import { useLockFn } from '@reause/shared'

const submit = useLockFn(async (id: string) => {
  await api.submit(id)
})

submit('a') // runs
submit('b') // dropped — resolves to `undefined`, does not reject
```

A call made while a previous one is still in flight is **dropped**: the wrapper
does not queue it, does not await the call it lost to, and does not reject. It
resolves to `undefined` — an `async` function always hands back a promise, so
the dropped call is an already-settled `Promise<undefined>`, never a bare
`undefined`. That is why the return type is
`(...args: P) => Promise<V | undefined>` and not `Promise<V>`; the `undefined`
branch _is_ the dropped call, and it is how a caller tells "dropped" apart from
"failed". The arguments and result stay typed through the `P` / `V` generic
parameters.

The lock is released in a `finally`, so a rejected `fn` cannot deadlock the
hook: the error is rethrown to the caller of the wrapper and the lock is already
free by the time that rejection is observable. A call that throws does not leave
the hook permanently locked.

The lock itself lives in a ref, which gives it the lifetime of the component
instance rather than of a render:

- It **survives re-renders**, including re-renders that produce a new wrapper.
  The wrapper is memoised on `[fn]`, so an unstable `fn` (an inline arrow, which
  is re-created every render) yields a new wrapper every render — but the
  `useRef` is the same object, so the new wrapper still sees the in-flight call
  and drops the next one. A new wrapper is not a new lock.
- It **does not survive a remount**, because a remount is a fresh `useRef`. An
  in-flight call from the unmounted instance keeps running, and the new instance
  starts unlocked.

Two instances of the hook never share a lock — it is per instance, not global.

Because the wrapper is memoised on `[fn]`, passing an inline `async` arrow gives
a new wrapper identity on every render, which makes it unusable as an effect or
memo dependency. Read the function through `useLatest` when the wrapper needs to
keep a stable identity. (ahooks points at its own `useMemoizedFn` here, which has
no counterpart in `@reause/shared` yet.)

Nothing here reads `window` or `document`, so the hook is safe to call during
server rendering.

Ported from ahooks'
`source/ahooks/packages/hooks/src/useLockFn/index.ts` (25 LOC), with its
`index.en-US.md` and `__tests__/index.spec.ts` mirrored. ahooks ships the hook as
a default export and reause exports `useLockFn` by name; the body — the
`useRef`-backed lock, the early `return` while locked, the lock set before the
call, and the `try` / `catch` / `finally` that rethrows and releases — is
upstream's statement for statement.
