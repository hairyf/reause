import type { DependencyList, EffectCallback } from 'react'
import { useEffect, useRef } from 'react'
import { deepEqual } from '../useWatchDeep'

/** `false` for anything primitives box into `Object(...)` — mirrors upstream's helper. */
function isPrimitive(val: any): boolean {
  return val !== Object(val)
}

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
 * `process.env.NODE_ENV !== 'production'` gate — a warning when `deps` is empty
 * and a warning when every dep is a primitive, both cases where a plain
 * `useEffect` is what the caller wants. One deliberate micro-divergence, in the
 * house direction: the gate is written `typeof process !== 'undefined' &&
 * process.env.NODE_ENV !== 'production'`, the guard this repo already uses in
 * `packages/core/createPortalSlot/index.tsx`. Upstream's bare `process.…`
 * throws a `ReferenceError` in a browser bundle that never replaces
 * `NODE_ENV`; the `typeof` prefix skips the warning there instead. Where the
 * build does replace `NODE_ENV` (bundlers, and this package's own tests) the
 * two forms are indistinguishable. Note also that upstream's second guard is
 * not skipped for an empty array (`[].every()` is vacuously `true`), so empty
 * deps report **both** warnings; that is mirrored as-is.
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
export function useDeepCompareEffect(effect: EffectCallback, deps: DependencyList): void {
  // eslint-disable-next-line node/prefer-global/process -- browser package: `node:process` is not bundled, and this prefix keeps the reference safe in builds that do not replace `NODE_ENV` (mirrors packages/core/createPortalSlot/index.tsx)
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    if (!(Array.isArray(deps)) || !deps.length) {
      console.warn(
        '`useDeepCompareEffect` should not be used with no dependencies. Use React.useEffect instead.',
      )
    }

    if (deps.every(isPrimitive)) {
      console.warn(
        '`useDeepCompareEffect` should not be used with dependencies that are all primitive values. Use React.useEffect instead.',
      )
    }
  }

  const ref = useRef<DependencyList | undefined>(undefined)

  if (!ref.current || !deepEqual(deps, ref.current)) {
    ref.current = deps
  }

  useEffect(effect, ref.current)
}
