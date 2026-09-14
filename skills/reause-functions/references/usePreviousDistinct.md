---
category: State
---

# usePreviousDistinct

Just like `usePrevious`, but it only moves once the value actually changes — React port of react-use's [`usePreviousDistinct`](https://github.com/streamich/react-use/blob/master/docs/usePreviousDistinct.md) (`source/react-use/src/usePreviousDistinct.ts`, docs page `source/react-use/docs/usePreviousDistinct.md`; upstream exports it as the **default** export, reause exports the hook as a **named** export).

## Usage

```tsx
import { usePreviousDistinct } from '@reause/shared'

const previous = usePreviousDistinct(count) // `undefined` until `count` changes
```

The reported value is the previously committed value, updated **only when the comparator says the two differ**, and `undefined` on the first render. An unchanged re-render is not a change, so `previous` never becomes a copy of the current value. The comparison happens **during render**, not in an effect, so the pass that sees a new value is also the pass that reports the old one.

You can also provide a way of identifying the value as unique. By default, a strict equality (`prev === next`) is used.

```tsx
import { usePreviousDistinct } from '@reause/shared'

const previousRounded = usePreviousDistinct(count, (prev, next) =>
  Math.round(prev ?? 0) === Math.round(next))
```

`compare` receives the last value the hook _accepted as distinct_ — not necessarily the one it returned — as its first argument, and the value being rendered now as its second. The exported `Predicate<T>` type describes that signature.

Under `<StrictMode>` the mount render is double-invoked and both passes share the hook's refs, so the committed pass already reads the mount flag as `false`. The first-render contract still holds for the default comparator (on that pass the tracked ref and `value` are the same reference, so strict equality answers "equal"). A comparator that reports _every_ pair as different is the exception: it can commit a value on the double-invoked mount pass, exactly as the single-pass upstream would on that same pass. This is upstream's design, kept deliberately — React's position is that a render-phase flag is inherently not StrictMode-proof (facebook/react#24527).

**Not the same hook as `@reause/core`'s `usePrevious`.** `usePrevious` is a VueUse port that is _unconditional_: it reports the value of the previous committed render, whatever it was, and is updated from an effect. `usePreviousDistinct` is **predicate-gated** — a run of equivalent values does not shift it, and only an accepted change displaces the reported value. The two also live in different packages.

## Reference

```ts
function usePreviousDistinct<T>(value: T, compare?: Predicate<T>): T | undefined
type Predicate<T> = (prev: T | undefined, next: T) => boolean
```

## Type Declarations

```ts
/**
 * Tells `usePreviousDistinct` whether two values count as the same one.
 *
 * `prev` is the last value the hook accepted as *distinct* — not necessarily
 * the value it returned, and `undefined` before the first change — and `next`
 * is the value the component is rendering with now. Returning `true` means
 * "these are equivalent": the incoming value becomes the tracked one without
 * displacing the value the hook reports, so no new "previous" value is
 * recorded. Returning `false` commits the change.
 *
 * Upstream react-use exports this exact type from
 * `source/react-use/src/usePreviousDistinct.ts`, and reause keeps its name,
 * shape and parameter order unchanged (AGENTS.md §1.1, React source ⇒ direct
 * mirror).
 */
export type Predicate<T> = (prev: T | undefined, next: T) => boolean
/**
 * React port of react-use's `usePreviousDistinct`.
 *
 * Map from react-use `usePreviousDistinct`
 * (`source/react-use/src/usePreviousDistinct.ts`). Returns the value the
 * component rendered with *before* the current one, but only counts a value as
 * "before" when `compare` says the two differ: the previously committed
 * value, updated only when `compare(curRef.current, value)` returns `false`,
 * and `undefined` on the very first render. Upstream default-exports the hook
 * and re-exports it from `src/index.ts`; reause exports it by name, and
 * exports upstream's `Predicate<T>` type alongside it because the type is part
 * of the public API a caller needs to type a custom comparator.
 *
 * The default comparator is **strict equality** (`prev === next`), mirrored
 * exactly, and so is the comparison's position in the render body. Both matter:
 *
 * - *Strict equality* means an unchanged re-render (or a re-render to a value
 *   `Object.is`-equal but not `===`-equal, and vice versa) is not a change, so
 *   the hook never reports the current value as its own predecessor.
 * - *Render body, not an effect.* React updates refs written during render as
 *   soon as the pass runs, so the value returned here is already correct in the
 *   same render that observes the change. Deferring the comparison to an effect
 *   would return the stale predecessor for that pass and only settle one render
 *   later, which is the observable difference upstream's placement avoids. The
 *   write is idempotent for a given set of inputs, so repeating the pass is
 *   safe.
 *
 * `useFirstMountState` — the react-use helper the pin imports — is the shared
 * `useIsFirstRender` (#940), imported above instead of inlined. react-use's
 * helper (`useRef(true)` flipped during the render phase, returning the same
 * `boolean`) and mantine's `useIsFirstRender` are the same algorithm, and a
 * differential probe that renders both in one component and compares every
 * observed pass shows they agree on every pass, inside and outside
 * `<StrictMode>`, per instance and across unmount/remount — see the probe in
 * `index.test.tsx`. Importing it keeps one copy of the primitive in the
 * package instead of adding a fourth; the reference is relative
 * (`../useIsFirstRender`) like every other intra-package import here. This
 * supersedes the mapping issue's instruction to inline the helper, and matches
 * what `useUpdateEffect` — the precedent that issue cites — now does.
 *
 * Two deliberate deviations from a verbatim copy of the pin, all forced by
 * this repo's toolchain, all annotation/shape-only (no assertions, and the
 * runtime is identical):
 *
 * - `useRef<T>()` in the pin relies on a zero-argument `useRef` overload that
 *   `@types/react` 19 removed, so the previous-value ref is created as
 *   `useRef<T | undefined>(undefined)` — the same `{ current: T | undefined }`
 *   holding the same initial `undefined`.
 * - The pin's default comparator is a *top-level generic arrow*
 *   (`const strictEquals = <T>(...) => ...`). That form does not parse in a
 *   `.tsx` file at all: TypeScript lexes the `<T>` as the start of a JSX
 *   element (`TS17008: JSX element 'T' has no corresponding closing tag`), and
 *   the pin's file is `.ts`. It is written here as a `function` declaration
 *   with the same type parameters, parameters, body and inferred `boolean`
 *   result; the `: boolean` annotation the pin omits is kept because the repo
 *   states hook return types explicitly.
 *
 * `<StrictMode>` caveat — upstream's behaviour, mirrored deliberately. The
 * mount render is double-invoked and both passes share the refs, so the
 * committed* pass already reads `false` from `useIsFirstRender`. That does not
 * disturb the first-render contract: on the committed mount pass `curRef` and
 * `value` are still the same reference, so the default comparator is `true` and
 * the hook still returns `undefined`. A comparator that reports *every* pair as
 * different is the exception — it can commit a value on the double-invoked
 * mount pass, exactly as the single-pass pin would on that same pass. Making
 * this StrictMode-proof would mean an effect-based mount flag, which is a
 * different hook (React's position is that it is inherent to the pattern:
 * facebook/react#24527), so this port keeps upstream's design.
 *
 * **Not the same hook as `@reause/core`'s `usePrevious`.** `usePrevious` is a
 * VueUse port that is *unconditional*: it reports the value of the previous
 * committed render, whatever it was, and is driven by an effect. This hook is
 * predicate-gated and reuses its stored "previous" until the comparator
 * accepts a new one, so a run of equivalent renders does not shift it. They
 * also live in different packages — `@reause/shared` here, `@reause/core`
 * there.
 *
 * @example
 * const previous = usePreviousDistinct(count) // `undefined` until `count` changes
 * const previousRounded = usePreviousDistinct(count, (prev, next) =>
 *   Math.round(prev ?? 0) === Math.round(next))
 */
export declare function usePreviousDistinct<T>(
  value: T,
  compare?: Predicate<T>,
): T | undefined
```
