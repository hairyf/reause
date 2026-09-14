import { useCallback, useRef } from 'react'

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
export function useLockFn<P extends any[] = any[], V = any>(fn: (...args: P) => Promise<V>) {
  const lockRef = useRef(false)

  return useCallback(
    async (...args: P) => {
      if (lockRef.current) {
        return
      }
      lockRef.current = true
      try {
        const ret = await fn(...args)
        return ret
      }
      // Upstream's clause, kept so this file diffs cleanly against the pin. It is
      // provably redundant beside the `finally` below (the lock is released
      // either way, and an uncaught error propagates on its own), so deleting it
      // would change no behaviour — but it is upstream's text and the port
      // mirrors upstream, so it stays.
      // eslint-disable-next-line no-useless-catch -- upstream's redundant rethrow, kept to mirror the pin
      catch (e) {
        throw e
      }
      finally {
        lockRef.current = false
      }
    },
    [fn],
  )
}
