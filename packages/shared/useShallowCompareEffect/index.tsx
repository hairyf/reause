import type { DependencyList, EffectCallback } from 'react'
import { useEffect, useRef } from 'react'

/**
 * One-level (shallow) equality — the comparator {@link useShallowCompareEffect}
 * applies to each dependency, exported from `@reause/shared` so every consumer
 * shares one set of semantics.
 *
 * - Primitives and identical references compare with `Object.is`: `NaN` equals
 *   `NaN`, and `+0` is distinct from `-0`.
 * - Arrays compare by length and then per index, every element with `Object.is`
 *   — an element that is itself an object compares **by reference**.
 * - Objects compare by their own enumerable string keys: the key counts must
 *   match and every value compares with `Object.is`. A nested object compares
 *   **by reference**, never by its contents.
 * - Functions compare by reference.
 *
 * One level only, nothing recurses. `shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })`
 * is `false` — the two `a` objects are different references — while
 * `shallowEqual({ a: inner }, { a: inner })` is `true` even after `inner` was
 * mutated in place, because only the parent references are compared. That is
 * exactly what "shallow" means here, and it is the thing callers get wrong: use
 * `useWatchDeep`'s `deepEqual` when a nested field behind an unchanged parent
 * reference has to be noticed.
 *
 * This mirrors the pin's **contract**, not its comparator. The pinned upstream
 * hook imports `fast-shallow-equal`'s `equal`, a dependency issue #922 forbids
 * and that is not installed in this repo — so exact parity is unattainable by
 * construction, and the issue's `Object.is` prescription is the operable spec.
 * `Object.is` is also React's own dependency semantics, which is the right model
 * for a hook that governs an effect's re-run. The observable differences,
 * deliberately kept and pinned by tests rather than hidden:
 *
 * 1. `NaN` compares equal here; upstream's `===` test makes it unequal.
 * 2. `+0` and `-0` are distinct here; upstream's `===` test makes them equal.
 * 3. Only own keys are compared here; upstream's `keys[i] in b` also accepts an
 *    inherited key when the previous list carries that key as an own property,
 *    so an inherited-property change is invisible here and visible there.
 *
 * The same key-count rule means a non-array object with no own enumerable keys
 * compares equal to any other such value — a `Date`, `RegExp`, `Map` or `Set`
 * compares shallow-equal to a distinct instance, exactly as `fast-shallow-equal`
 * does. Compare timestamps or contents explicitly when that matters.
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b))
    return true

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null)
    return false

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false
    return a.every((item, index) => Object.is(item, b[index]))
  }

  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length)
    return false

  const aRecord = a as Record<string, unknown>
  const bRecord = b as Record<string, unknown>
  return aKeys.every(key => Object.hasOwn(bRecord, key) && Object.is(aRecord[key], bRecord[key]))
}

/** `true` for anything that is not an object or a function — upstream's `val !== Object(val)` test. */
const isPrimitive = (val: any) => val !== Object(val)

/**
 * Upstream's dependency-list comparison: every entry of the previous list must
 * be shallow-equal to the entry at the same index of the next one. It iterates
 * the *previous* list, so a next list that grew is seen as equal while a
 * shorter one is not — upstream's behaviour, mirrored as-is (React warns when a
 * deps array changes size between renders anyway).
 */
function shallowEqualDepsList(prevDeps: DependencyList, nextDeps: DependencyList) {
  return prevDeps.every((dep, index) => shallowEqual(dep, nextDeps[index]))
}

/**
 * React port of react-use's `useShallowCompareEffect` — `useEffect` whose
 * dependency list is compared by one-level (shallow) equality instead of
 * reference identity, so a caller may rebuild a deps object every render
 * without re-running the effect as long as no top-level field changed.
 *
 * Map from react-use `useShallowCompareEffect`
 * (source/react-use/src/useShallowCompareEffect.ts).
 *
 * Mapping: react-use is mirrored directly (AGENTS.md §1.1) — same signature
 * `(effect: EffectCallback, deps: DependencyList) => void`, `deps` stays
 * **required** (there is no `useEffect`-style optional list, because the whole
 * point is comparing one), and the `shallowEqual` comparator the pinned module
 * imports from `fast-shallow-equal` is reimplemented locally instead of adding
 * that dependency (issue #922; no new dependencies). Upstream default-exports
 * the hook; reause exports it as a named export, the convention for these
 * mirrors.
 *
 * The generic primitive upstream wraps — `useCustomCompareEffect`, from
 * `source/react-use/src/useCustomCompareEffect.ts` — is **inlined privately**
 * below (a private `useRef<DependencyList | undefined>` plus the conditional
 * assignment and `useEffect(effect, ref.current)`) rather than imported from the
 * sibling `useDeepCompareEffect` port, even though upstream shares it between
 * the two hooks: both mapping issues require the logic to stay private, and
 * exporting a public `useCustomCompareEffect` would grow the public API beyond
 * what either issue asked for. The duplication is one ref and one conditional;
 * a future extraction into a shared private primitive could unify them without
 * changing either hook's public surface.
 *
 * The dev-only `console.warn` guards are upstream's, with the same conditions:
 * an empty (or non-array) deps list, and a deps list whose entries are all
 * primitives. Both cases mean plain `useEffect` is the right hook. The gate is
 * the pin's bare form — `process.env.NODE_ENV !== 'production'` — and rests on
 * the same assumption React's own source makes: the bundler replaces
 * `process.env.NODE_ENV` with a string literal at build time, which is what
 * keeps the reference safe in the browser and the warnings live (a production
 * build inlines `'production'` and drops the branch entirely). The
 * `node/prefer-global/process` disable comment records that contract. The
 * `typeof process !== 'undefined' &&` variant used elsewhere
 * (`packages/core/createPortalSlot/index.tsx`) closes the gate in every browser
 * bundle that does not define a `process` global — verified under vitest's
 * chromium project, where `typeof process` is `'undefined'` — which would make
 * these two warnings dead code exactly where a browser consumer needs them.
 *
 * The effect runs on mount and then whenever `shallowEqualDepsList` says the
 * list changed; cleanups run before the next invocation and on unmount, exactly
 * as `useEffect` does. As upstream, the ref is written during render so React
 * can be handed a referentially stable array; the ref guard makes that write
 * idempotent across React's double-invoked StrictMode renders.
 *
 * Boundary: shallow compares one level. A changed nested field behind an
 * unchanged parent reference will **not** re-run the effect (see
 * {@link shallowEqual}); use `useWatchDeep` — or a deep-compare effect — when
 * nesting has to be seen.
 *
 * @example
 * ```tsx
 * const options = { step: 2 } // new object every render — shallow-equal to the last
 * useShallowCompareEffect(() => {
 *   inc(options.step)
 * }, [options]) // re-runs only when `step` changes, not on every render
 * ```
 */
export function useShallowCompareEffect(effect: EffectCallback, deps: DependencyList): void {
  // eslint-disable-next-line node/prefer-global/process -- React's own source assumes the bundler replaces `process.env.NODE_ENV` with a string literal at build time; that replacement is what keeps the reference safe in the browser and the warnings live, whereas a `typeof process !== 'undefined' &&` prefix would silently close this gate in every browser bundle without a `process` global
  if (process.env.NODE_ENV !== 'production') {
    if (!(Array.isArray(deps)) || !deps.length) {
      console.warn(
        '`useShallowCompareEffect` should not be used with no dependencies. Use React.useEffect instead.',
      )
    }

    if (deps.every(isPrimitive)) {
      console.warn(
        '`useShallowCompareEffect` should not be used with dependencies that are all primitive values. Use React.useEffect instead.',
      )
    }
  }

  // Inlined `useCustomCompareEffect` — see the JSDoc above for why it is not
  // imported from the `useDeepCompareEffect` port.
  const ref = useRef<DependencyList | undefined>(undefined)

  if (!ref.current || !shallowEqualDepsList(deps, ref.current)) {
    ref.current = deps
  }

  useEffect(effect, ref.current)
}
