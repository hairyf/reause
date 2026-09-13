---
category: Lifecycle
---

# useDeepCompareEffect

`useEffect` whose dependency comparison is **deep** — the effect re-runs only when `deps` differ structurally, so an options object rebuilt on every render stays inert. React port of react-use's `useDeepCompareEffect`, whose upstream implementation lives in `source/react-use/src/useDeepCompareEffect.ts` and delegates to `source/react-use/src/useCustomCompareEffect.ts` with the `isDeepEqual` re-exported by `source/react-use/src/misc/isDeepEqual.ts`. This port inlines that custom-compare primitive instead of exposing a second public hook: a `useRef<DependencyList>` holds the last deps array the effect ran with, `deepEqual` decides whether the current render's deps replace it, and `useEffect(effect, ref.current)` receives the stored array — React's own element-wise comparison then skips the effect whenever the deps are deep-equal. The comparison reuses `@reause/shared`'s existing `deepEqual`, so no `fast-deep-equal` dependency is added.

`deps` is **required**, exactly as upstream. Outside production the hook also warns through `console.warn` when `deps` is empty and when every dep is a primitive value — both are cases where a plain `useEffect` is what the caller wants — while still behaving normally. It is not `useWatchDeep` (VueUse): that watches a reactive value and reports changes to a callback, whereas this only decides whether a React effect may re-run and never calls a callback itself. Use `useWatchDeep` to react to a value, and this hook to key an effect on one.

## Usage

```tsx
import { useDeepCompareEffect } from '@reause/shared'
import { useState } from 'react'

function Demo() {
  const [count, setCount] = useState(0)
  // rebuilt on every render — a new reference, equal contents until `count` changes
  const options = { id: count, tags: ['a', 'b'] }

  useDeepCompareEffect(() => {
    // runs on mount and whenever `options` deep-changes — not on every re-render
    console.log('options changed', options)
    return () => console.log('cleanup')
  }, [options])

  return <button onClick={() => setCount(count + 1)}>increment</button>
}
```

## Type Declarations

```ts
/**
 * React port of react-use's `useDeepCompareEffect`.
 *
 * Map from react-use `useDeepCompareEffect` (upstream file
 * `source/react-use/src/useDeepCompareEffect.ts`): the effect re-runs only when
 * `deps` differ by **deep** equality, so a deps array rebuilt with equal
 * contents on every render stays inert.
 *
 * Mapping: upstream is a thin wrapper over `useCustomCompareEffect`
 * (`source/react-use/src/useCustomCompareEffect.ts`, deliberately not part of
 * this issue set), which it calls with the `isDeepEqual` of
 * `source/react-use/src/misc/isDeepEqual.ts` (a re-export of
 * `fast-deep-equal/react`). That custom-compare primitive is inlined here
 * instead of becoming a second public hook: a `useRef<DependencyList>` holds
 * the last deps array the effect ran with, `deepEqual` decides whether the
 * current render's deps replace it, and `useEffect(effect, ref.current)`
 * receives the **stored** array — React then compares that array element-wise
 * against the one it saw last time, and because a deep-equal render hands the
 * identical array back, the effect is skipped. A deep difference stores the new
 * array, so React sees a changed element and re-runs the effect. The comparison
 * reuses `deepEqual` from `@reause/shared`
 * (`packages/shared/useWatchDeep/index.tsx`), so no `fast-deep-equal`
 * dependency is added (reference-chain rule, docs/subagent-execution.md §3.2).
 *
 * `deps` stays **required**, exactly as upstream's
 * `(effect: EffectCallback, deps: DependencyList) => void`: it is what lets the
 * dev-only guards below fire. Upstream ships them as part of the hook's
 * usability contract and this port keeps the same conditions and the same
 * `process.env.NODE_ENV !== 'production'` gate, **verbatim** — a warning when
 * `deps` is empty and a warning when every dep is a primitive, both cases where
 * a plain `useEffect` is what the caller wants. Like React's own source, that
 * gate depends on the bundler replacing `process.env.NODE_ENV` with a literal
 * at build time while configuring no `process` shim; that replacement is what
 * makes the warnings fire in a browser development build, and it is the same
 * assumption React itself makes. Note also that upstream's second guard is not
 * skipped for an empty array (`[].every()` is vacuously `true`), so empty deps
 * report **both** warnings; that is mirrored as-is.
 *
 * Boundary with {@link useWatchDeep} (VueUse): `useWatchDeep` watches a
 * reactive value and invokes a callback when it deep-changes — it observes data
 * and hands the callback `(value, oldValue)`. This hook observes nothing and
 * never calls a callback on its own; it only decides whether a React effect may
 * re-run, and the effect body is still the caller's own. Neither can emulate
 * the other: `useWatchDeep` fires on mount (`immediate`) and reports previous
 * values, which an effect keyed on deps must not do, while
 * `useDeepCompareEffect` cannot tell you what changed or what the previous
 * value was. Use `useWatchDeep` to react to a value, and this hook to key an
 * effect on one.
 *
 * Upstream ships this hook as a default export; reause exposes it as a named
 * export (repo convention) with the same signature and the same behaviour.
 * react-use is mirrored directly, so the signature is not adapted (AGENTS.md
 * §1.1).
 *
 * @example
 * useDeepCompareEffect(() => {
 *   // `options` is rebuilt on every render; this runs only when it deep-changes
 *   return () => console.log('cleanup')
 * }, [options])
 */
export declare function useDeepCompareEffect(
  effect: EffectCallback,
  deps: DependencyList,
): void
```
