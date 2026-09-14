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

## Type Declarations

```ts
/**
 * React port of ahooks' `useLockFn`.
 *
 * Map from ahooks `useLockFn`
 * Mapping: mirrored 1:1 — the generic parameter list (`P extends any[] = any[]`,
 * `V = any`), the `useRef`-backed lock, the `useCallback` whose dependency list
 * is `[fn]` alone, and every statement of the pin's body are upstream's. The
 * function is exported **by name** rather than by default, and is a top-level
 * `function` declaration, because reause requires both
 * (`antfu/top-level-function`); upstream writes `function useLockFn(…)` and
 * ships it as `export default useLockFn`. No other deviation exists — there is
 * no assertion, no widened local, and no extra `useRef` in this file.
 *
 * **The contract: a call made while one is already in flight is dropped.** The
 * wrapper checks `lockRef.current` first; when it is `true` the wrapper
 * `return`s, and because it is an `async` function that call resolves — it does
 * **not** reject — to `undefined`. It does not queue, it does not await the
 * in-flight call, and it never runs `fn`. That is why the returned signature is
 * `(...args: P) => Promise<V | undefined>` and not `Promise<V>`: the `undefined`
 * branch *is* the dropped call, and callers rely on the distinction between
 * "dropped" and "failed". The wrapper is `async`, so a dropped call still hands
 * back a promise (an already-resolved one); it never returns a bare
 * `undefined`.
 *
 * **The lock is released in a `finally`, so a rejection cannot deadlock the
 * hook.** A rejected `fn` rethrows to the caller (upstream's `catch (e) { throw
 * e }` is kept verbatim, and is redundant next to the `finally` — the `finally`
 * runs whether or not the `catch` is present), and the lock is already `false`
 * by the time the rejection is observable. A `finally`-less variant leaves the
 * hook permanently locked after the first failure; that is the defect this file
 * is most likely to acquire, so it is pinned by a test.
 *
 * **The lock is per hook instance, and it lives in a ref, so it survives
 * re-renders but not a remount.** Two consequences worth stating precisely,
 * because the obvious guess is wrong about one of them:
 *
 * - A new wrapper identity does **not** mean a new lock. `useCallback` is keyed
 *   on `[fn]`, so an unstable `fn` (an inline arrow) makes the wrapper a fresh
 *   function on every render — but `useRef` returns the *same* ref object, so
 *   the new wrapper observes the same `lockRef` and drops calls that the
 *   previous wrapper started. The lock is not recreated with the wrapper.
 * - A remount *is* a fresh lock, because a remount is a fresh `useRef`. An
 *   in-flight call from the unmounted instance keeps running, and the new
 *   instance is free to start its own.
 *
 * Document the first point for callers of an unstable `fn`: they get a new
 * wrapper every render (so it must not be used as an effect or memo
 * dependency), and they should read `fn` through `useLatest` — the batch's
 * stable-identity primitive — when they want the wrapper to keep its identity.
 * (ahooks' own answer, `useMemoizedFn`, has no counterpart in this package yet,
 * so `useLatest` is what this repo can point at.)
 *
 * Nothing reads `window` or `document`, so the hook is SSR-safe.
 *
 * @param fn The async function to lock. Called with the wrapper's arguments and
 * awaited; its rejection is rethrown to the caller of the wrapper. Its identity
 * is the wrapper's only `useCallback` dependency.
 * @returns A locked wrapper: `(...args: P) => Promise<V | undefined>`, where a
 * resolved `undefined` means the call was dropped because another was still in
 * flight.
 *
 * @example
 * const submit = useLockFn(async () => {
 *   await api.submit()
 * })
 *
 * // rapid double-click: the first call runs, the second resolves to undefined
 * submit()
 * submit() // Promise<undefined> — dropped, not queued
 */
export declare function useLockFn<P extends any[] = any[], V = any>(
  fn: (...args: P) => Promise<V>,
): (...args: P) => Promise<V | undefined>
```
