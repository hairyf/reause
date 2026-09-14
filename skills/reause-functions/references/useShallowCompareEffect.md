---
category: Lifecycle
---

# useShallowCompareEffect

`useEffect` whose dependency list is compared by one-level (shallow) equality instead of reference identity.

## Usage

```tsx
import { useShallowCompareEffect } from '@reause/shared'

const options = { step: 2 } // rebuilt on every render — shallow-equal to the last one

useShallowCompareEffect(() => {
  inc(options.step)
}, [options]) // runs on mount and whenever `step` changes, not on every re-render
```

## Type Declarations

```ts
/**
 * One-level (shallow) equality — the comparator {@link useShallowCompareEffect} applies to each
 * dependency, exported from `@reause/shared` so every consumer shares one set of semantics.
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
 * One level only, nothing recurses. `shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })` is `false` —
 * the two `a` objects are different references — while `shallowEqual({ a: inner }, { a: inner })`
 * is `true` even after `inner` was mutated in place, because only the parent references are
 * compared. That is exactly what "shallow" means here, and it is the thing callers get wrong: use
 * `useWatchDeep`'s `deepEqual` when a nested field behind an unchanged parent reference has to be
 * noticed.
 *
 * This mirrors the pin's **contract**, not its comparator. The pinned upstream hook imports
 * `fast-shallow-equal`'s `equal`, a dependency issue #922 forbids and that is not installed in this
 * repo — so exact parity is unattainable by construction, and the issue's `Object.is` prescription
 * is the operable spec. `Object.is` is also React's own dependency semantics, which is the right
 * model for a hook that governs an effect's re-run. The observable differences, deliberately kept
 * and pinned by tests rather than hidden:
 *
 * 1. `NaN` compares equal here; upstream's `===` test makes it unequal. 2. `+0` and `-0` are
 * distinct here; upstream's `===` test makes them equal. 3. Only own keys are compared here;
 * upstream's `keys[i] in b` also accepts an inherited key when the previous list carries that key
 * as an own property, so an inherited-property change is invisible here and visible there.
 *
 * The same key-count rule means a non-array object with no own enumerable keys compares equal to
 * any other such value — a `Date`, `RegExp`, `Map` or `Set` compares shallow-equal to a distinct
 * instance, exactly as `fast-shallow-equal` does. Compare timestamps or contents explicitly when
 * that matters.
 */
export declare function shallowEqual(a: unknown, b: unknown): boolean
/**
 * Map from react-use `useShallowCompareEffect` (source/react-use/src/useShallowCompareEffect.ts).
 *
 * @example
 * ```tsx
 * const options = { step: 2 } // new object every render — shallow-equal to the last
 * useShallowCompareEffect(() => {
 *   inc(options.step)
 * }, [options]) // re-runs only when `step` changes, not on every render
 * ```
 */
export declare function useShallowCompareEffect(
  effect: EffectCallback,
  deps: DependencyList,
): void
```
