---
category: State
---

# useSafeState

A `useState` whose setter is a no-op once the component has unmounted — React port of ahooks' [`useSafeState`](https://ahooks.js.org/hooks/use-safe-state) (`source/ahooks/packages/hooks/src/useSafeState/`; upstream exports it as the **default** export, reause exports the hook as a **named** export).

## Usage

```tsx
import { useSafeState } from '@reause/shared'

const [value, setValue] = useSafeState(0)

async function load() {
  const data = await fetchData()
  // ignored if the component unmounted while the request was in flight
  setValue(data)
}
```

`setValue` is referentially stable for the lifetime of the component and simply returns early while `useUnmountedRef().current` is `true`, so a late update from an async continuation or timer never reaches `useState`. The initial state may be a lazy factory — `useSafeState(() => 42)` — exactly as with `useState`, because the argument is handed straight to it. The zero-argument overload returns `[S | undefined, …]`, so `useSafeState<string>()` starts `undefined`.

**Functional updates work.** The setter is typed `Dispatch<SetStateAction<S>>`, and that promise holds at runtime: `setValue(previous => previous + 1)` is invoked by React as a real updater against the latest state, not stored as the state value. That is measured rather than assumed — under React 19 in chromium, an updater called from `10` runs once and commits the `number` `11` (never a function), and two batched updaters from `{ n: 1 }` observe `{ n: 1 }` then `{ n: 2 }`, committing `{ n: 3 }` in a single re-render. The one case no runtime setter can treat as an updater is a state type that is _itself_ a function — the standard functional-update caveat, shared with `useState`.

**The guard is a passive-effect timing contract.** The unmount flag flips in `useUnmountedRef`'s `useEffect` cleanup, so it is reliable for a callback that resumes after the unmount, which is when the flag is actually needed. It is not synchronous with unmount: a call issued in the same task as the unmount, before passive effects flush, can still reach `useState`. React silently ignores a state update on an unmounted component, so the visible result is the same — the ref just makes the intent explicit and skips the work. Note the consequence for the updater form: because the guard runs _before_ `setState`, an updater passed after unmount is **not invoked at all**.

Ported from ahooks' `source/ahooks/packages/hooks/src/useSafeState/index.ts` (23 LOC), its `index.en-US.md` / `index.zh-CN.md` docs, and its `__tests__/index.spec.ts`.

Different from the neighbouring `useStateAutoReset` / `useStateManualReset` (VueUse ports) and `useStateDefault` / `useStateWithControl`: those shape _when_ state resets or changes, while `useSafeState` keeps plain `useState` semantics and only decides _whether a setter call is allowed to land_ after unmount.

## Type Declarations

```ts
/**
 * React port of ahooks' `useSafeState`.
 *
 * Map from ahooks `useSafeState`
 * (`source/ahooks/packages/hooks/src/useSafeState/`). Mirrored 1:1 from the
 * pin: the unmount flag comes from this package's `useUnmountedRef` (upstream
 * imports its own `../useUnmountedRef`), the state is a plain `useState`, and
 * `setSafeState` is a `useCallback(…, [])` that returns early once
 * `unmountedRef.current` is `true`. The nested `S`-typed parameter is what the
 * pin declares and it is **not** a bug — see the later paragraph, which records
 * what was measured rather than reasoned.
 *
 * The empty dependency array is honest: both captured values are stable. The
 * state setter is referentially stable by React's contract, and the ref
 * object* never changes identity (only its `.current` does), which is why
 * `useUnmountedRef` returns the container rather than a boolean. Adding
 * `unmountedRef` to the deps would not change behaviour — it adds nothing to
 * observe — but it would misdescribe the contract, so the setter they produce
 * stays stable for the lifetime of the component.
 *
 * **The unmount guard is a passive-effect timing contract.** The flag flips in
 * `useEffect` cleanup, so the guard is reliable for the realistic case — an
 * async continuation or timer callback that resumes after the unmount, by which
 * point React has flushed the passive effects of that commit. It is not
 * synchronous with unmount: a call issued in the very same task as the unmount,
 * before passive effects flush, can still reach `setState`. React ignores a
 * `setState` on an unmounted component without warning, so the observable
 * outcome is the same; the ref simply makes the intent explicit and skips the
 * work.
 *
 * **Functional updates work, and that is measured, not assumed.** The returned
 * setter is typed `Dispatch<SetStateAction<S>>`, which promises an updater
 * function is accepted, while the implementation forwards its argument straight
 * to `useState`'s setter. That looks like a type/value mismatch — a function
 * argument stored *as* the state value — but it is not: React's runtime
 * setter detects a function argument and invokes it as a reducer against the
 * latest state. Measured in chromium under React 19, in this exact shape:
 * `setSafeState(prev => prev + 1)` from `10` invokes the updater **once**,
 * commits `11` as a `number`, and neither stores nor renders a function. Two
 * batched updaters from `{ n: 1 }` see `{ n: 1 }` then `{ n: 2 }` and commit
 * `{ n: 3 }` in a single re-render — the serialization guarantee of a real
 * functional update. So the declared types are accurate and callers may rely on
 * the updater form.
 *
 * Two honest boundaries on that. First, the guard runs **before** `setState`,
 * so after unmount a functional update is skipped without invoking the updater
 * at all — the updater is not a hook, so calling it yourself is never safe, but
 * you can rely on it not running after unmount. Second, the one case React does
 * not treat as an updater is a `S` that is *itself* a function; `useSafeState`
 * cannot support that state type (neither can `useState`), which is the
 * standard functional-update caveat rather than a defect of this port.
 *
 * `StrictMode` is safe: the remaining re-render is driven by `useState`, and
 * `useUnmountedRef` re-initialises its ref on the double-invoked mount effect,
 * so the guard does not latch on.
 *
 * @example
 * const [value, setValue] = useSafeState(0)
 *
 * async function load() {
 *   const data = await fetchData()
 *   // ignored once the component has unmounted
 *   setValue(data)
 * }
 *
 * @example
 * const [count, setCount] = useSafeState(0)
 * setCount(previous => previous + 1)
 *
 * @param initialState Either the initial value or a lazy factory for it; both
 * forms are handed straight to `useState`.
 * @returns A tuple of the current state and a referentially stable setter that
 * is a no-op once the component has unmounted.
 */
export declare function useSafeState<S>(
  initialState: S | (() => S),
): [S, Dispatch<SetStateAction<S>>]
export declare function useSafeState<S = undefined>(): [
  S | undefined,
  Dispatch<SetStateAction<S | undefined>>,
]
```
