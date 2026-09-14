---
category: State
---

# useControllableState

A hook for combining controlled and uncontrolled state sources.

```tsx
const [value, setValue] = useControllableState(props.value, {
  defaultValue: 'initial',
  passive: true,
})
```

- Tuple `[value, setter]` and `{ value, onChange }` sources are always controlled: the current value is the resolved source and `setValue` writes through to the tuple setter / `onChange`.
- With `passive: true`, plain values, refs, and getters are treated as uncontrolled: the hook initializes from the source and local updates persist, and external source changes are synced back.
- With the default `passive: false`, a plain value, getter, or ref source is controlled — the external value wins on every render. `setValue` then has no channel back to the caller, so it warns instead of silently discarding the update; pass a tuple, a `{ value, onChange }` pair, or use `passive: true` to write.
- `defaultValue` accepts a value or lazy initializer; it seeds the internal state of uncontrolled sources.
- `setValue` accepts both values and updater functions wherever it has a write channel (tuple, `{ value, onChange }`, or uncontrolled sources).
- `shouldUpdate(prev, next)` returns `true` when the value should be committed; unchanged values are ignored — the passive sync honors it too.
- Note: plain object/array sources with `passive: true` are not synced back (an inline literal is a new identity on every render, so syncing it would re-render forever). Use a `{ value, onChange }` pair or a getter source for object sync.

`toValue` resolution is applied on every render, so lazy getters, refs, tuples, and value objects are supported consistently.

## API

```ts
interface UseControllableStateOptions<T> {
  defaultValue?: T | (() => T)
  shouldUpdate?: (prev: T, next: T) => boolean
  passive?: boolean
}
```

## Type Declarations

```ts
export type StateTuple<T> = [T, Dispatch<SetStateAction<T>>]
/** A value, lazy getter, state tuple, or value/onChange pair. */
export type State<T> = StateValue<T>
export interface UseControllableStateOptions<T> {
  defaultValue?: T | (() => T)
  shouldUpdate?: (prev: T, next: T) => boolean
  passive?: boolean
}
/**
 * Combine controlled and uncontrolled state sources.
 *
 * `state` is resolved with `toValue` on every render. A tuple `[value, setter]` or a `{ value,
 * onChange }` pair is always controlled: the current value is the resolved source and `setValue`
 * writes through to the tuple setter / `onChange`. With `passive: true` a plain value or getter
 * source is uncontrolled — the hook initializes from the source and local updates persist, and
 * external source changes are synced back (honoring `shouldUpdate`). With the default `passive:
 * false` such a source is controlled (the external value wins on every render); `setValue` then has
 * no channel back to the caller, so it warns instead of silently discarding the update — pass a
 * tuple, a `{ value, onChange }` pair, or use `passive: true` to write. `defaultValue` (value or
 * lazy initializer) seeds the internal state of uncontrolled sources; `shouldUpdate(prev, next)`
 * guards every commit, including the passive sync.
 */
export declare function useControllableState<T>(
  state: State<T>,
  options?: UseControllableStateOptions<T>,
): StateTuple<T>
```
