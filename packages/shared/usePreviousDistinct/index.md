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
