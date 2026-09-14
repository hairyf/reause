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

## Type Declarations

```ts
/**
 * Tells `usePreviousDistinct` whether two values count as the same one.
 *
 * `prev` is the last value the hook accepted as *distinct* — not necessarily the value it returned,
 * and `undefined` before the first change — and `next` is the value the component is rendering with
 * now. Returning `true` means "these are equivalent": the incoming value becomes the tracked one
 * without displacing the value the hook reports, so no new "previous" value is recorded. Returning
 * `false` commits the change.
 *
 * Upstream react-use exports this exact type from
 * `source/react-use/src/usePreviousDistinct.ts`, and reause keeps its name,
 * shape and parameter order unchanged (AGENTS.md §1.1, React source ⇒ direct mirror).
 */
export type Predicate<T> = (prev: T | undefined, next: T) => boolean
/**
 * Map from react-use `usePreviousDistinct`
 * (`source/react-use/src/usePreviousDistinct.ts`).
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
