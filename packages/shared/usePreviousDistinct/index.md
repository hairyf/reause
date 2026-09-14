---
category: State
---

# usePreviousDistinct

Just like `usePrevious`, but it only moves once the value actually changes.

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
