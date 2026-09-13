---
category: Lifecycle
---

# useShallowCompareEffect

`useEffect` whose dependency list is compared by one-level (shallow) equality instead of reference identity — a React port of react-use's [`useShallowCompareEffect`](https://raw.githubusercontent.com/streamich/react-use/master/docs/useShallowCompareEffect.md) (docs page fetched; the rendered `https://streamich.github.io/react-use/?path=/story/lifecycle-useshallowcompareeffect--docs` page is unverified), whose implementation lives in `source/react-use/src/useShallowCompareEffect.ts` and wraps the generic `source/react-use/src/useCustomCompareEffect.ts` primitive, inlined privately here because neither mapping issue exposes it as public API. Signature: `useShallowCompareEffect(effect: EffectCallback, deps: DependencyList): void` — `deps` is required, and upstream default-exports the hook while reause exports it as a named export. Because a rebuilt deps object is compared one level deep, `useShallowCompareEffect(() => inc(options.step), [options])` re-runs when `options.step` changes, and stays silent on every other re-render; the effect still runs on mount, and cleanups run before the next invocation and on unmount exactly as `useEffect` does. In development a `console.warn` fires when `deps` is empty and when every entry is a primitive, because plain `useEffect` is the right hook in both cases. Those guards sit behind the house gate `typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'` (mirroring `packages/core/createPortalSlot/index.tsx`), so a browser bundle that never defines a `process` global closes the gate and the warnings stay silent there — verified under the chromium test project, where `typeof process` is `'undefined'`.

The comparator is exported as `shallowEqual` from `@reause/shared` so consumers agree on its semantics: primitives and identical references compare with `Object.is`, arrays by length and then per index, plain objects by own enumerable keys, functions by reference — and nothing recurses. It therefore mirrors the pin's contract rather than its comparator: upstream imports `fast-shallow-equal`, which issue #922 forbids and which is not installed in this repo, so exact parity is unattainable by construction. The differences are deliberate and pinned by tests — `NaN` compares equal here where upstream's `===` test makes it unequal, `+0` and `-0` are distinct here where upstream makes them equal, and only own keys are compared here where upstream's `keys[i] in b` also accepts an inherited key. `Object.is` is also React's own dependency semantics, which is the right model for a hook governing an effect's re-run.

Shallow means one level. A changed nested field behind an unchanged parent reference does **not** re-run the effect — `shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })` is `false` on two distinct `a` objects, while a mutated inner object behind the same parent reference is invisible — so use `useWatchDeep` (or a deep-compare effect) when nesting has to be noticed. Objects with no own enumerable keys, such as `Date`, `RegExp`, `Map` and `Set`, compare shallow-equal to a distinct instance of the same shape, as they do upstream; compare timestamps or contents explicitly when that matters.

## Usage

```tsx
import { useShallowCompareEffect } from '@reause/shared'

const options = { step: 2 } // rebuilt on every render — shallow-equal to the last one

useShallowCompareEffect(() => {
  inc(options.step)
}, [options]) // runs on mount and whenever `step` changes, not on every re-render
```
