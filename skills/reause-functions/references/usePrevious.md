---
category: Utilities
---

# usePrevious

Holds the previous value of a source

## Usage

```tsx
import { usePrevious } from '@reause/core'

const previous = usePrevious(counter) // `undefined` until the first change
// after each change, `previous` is the value the source had before it
```

## Type Declarations

```ts
/**
 * React port of VueUse's `usePrevious`.
 *
 * Map from @vueuse/core `usePrevious`
 * (`source/vueuse/packages/core/usePrevious/`). Holds the previous value of
 * a source: `undefined` until the source changes for the first time, then
 * the value the source had before the current one. Pass a second argument to
 * seed the first read instead of `undefined` (upstream overload
 * `usePrevious(value, initialValue: T): Readonly<ShallowRef<T>>`).
 *
 * Mapping: `shallowRef` + `watch(..., { flush: 'sync' })` → a `useRef` cache
 * updated in a `useEffect` keyed on the value. The cache is refreshed after
 * each commit, so a render reads the value the source had on the previous
 * committed render — and the hook stays on its seed during SSR (no effects
 * run on the server).
 *
 * Divergences from the Vue upstream:
 * - React values are plain, so the source is a plain `T` instead of a
 *   `MaybeRefOrGetter`, and the hook returns the value itself instead of a
 *   readonly shallow ref.
 * - React batches same-tick state updates into a single render. When the
 *   source changes several times between two commits (A→B→C), only the
 *   final value is rendered and the intermediate values are never observed,
 *   so the hook reports the last committed value (A). The upstream sync
 *   watch fires on every change and would report the value immediately
 *   before the current one (B); a plain value cannot observe unrendered
 *   intermediates, only the React commit boundary.
 * - Vue tracks the source reactively; React only sees a new value when the
 *   component rerenders with one — nested mutations of the same object are
 *   not tracked (matching the upstream shallow watch), and an unchanged
 *   rerender reports the previous render's value.
 *
 * @example
 * const previous = usePrevious(counter) // `undefined` until the first change
 * const previous = usePrevious(counter, 0) // `0` until the first change
 *
 * @see   {@link https://vueuse.org/core/usePrevious}
 */
export declare function usePrevious<T>(value: T): T | undefined
export declare function usePrevious<T>(value: T, initialValue: T): T
```
