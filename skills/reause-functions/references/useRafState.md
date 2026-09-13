---
category: Animation
---

# useRafState

State updates coalesced into an animation frame — React port of react-use's `useRafState`.

## Usage

```tsx
import { useRafState } from '@reause/shared'

const [state, setRafState] = useRafState(0)

// three calls inside one frame: a single re-render, with `state === 3`
setRafState(1)
setRafState(2)
setRafState(3)
```

`setRafState` is referentially stable and always cancels the frame it scheduled
last before requesting a new one, so any number of calls inside one frame
collapse into one commit carrying the last scheduled value; the pending frame is
cancelled on unmount through `@reause/shared`'s `useUnmount`. Because the frame
callback forwards `value` to `setState` unchanged, the updater form is an
ordinary React functional update — it sees the state the previous frame
committed, and since each call supersedes the one before it,
`setRafState(prev => prev + 1)` twice before a frame runs applies the updater
**once** (upstream's semantics: the superseded callback never reaches
`setState`). The initial state may be a lazy factory, `useRafState(() => 42)`,
as upstream passes it straight to `useState`.

Ported from react-use's `source/react-use/src/useRafState.ts` (24 LOC) and
`source/react-use/docs/useRafState.md`. Upstream exports it as the default;
reause exports it by name.

Different from `useRafFn` in `@reause/core`, which drives a **callback** on
every frame and exposes `pause` / `resume` controls: `useRafState` drives
**state**, so it is a fire-and-forget scheduler that only ever commits the last
value of a frame. react-use's `useRafState` has no VueUse counterpart.

## Type Declarations

```ts
/**
 * React port of react-use's `useRafState`.
 *
 * Map from react-use `useRafState`
 * Mapping: mirrors upstream as-is — the frame handle lives in a `useRef`, and
 * `setRafState` is a `useCallback(…, [])` that **cancels the previously
 * scheduled frame** before requesting a new one, so any number of calls inside
 * one frame collapses into a single commit that carries the last scheduled
 * `value`. That coalescing is the entire contract of the hook. `value` is
 * forwarded to `setState` unchanged from inside the frame callback, so the
 * updater form (`setRafState(prev => prev + 1)`) is a React functional update
 * that sees the state committed by the previous frame; since each new call
 * cancels the frame scheduled before it, two updater calls before a frame runs
 * apply the updater **once** — upstream's semantics, the superseded callback
 * never reaches `setState`. The pending frame is cancelled on unmount through
 * `@reause/shared`'s `useUnmount` (upstream uses react-use's own `useUnmount`),
 * and the initial state may be a lazy factory because it is passed straight to
 * `useState`. Upstream ships this hook as a default export; reause exports it
 * by name.
 *
 * @example
 * const [state, setRafState] = useRafState(0)
 *
 * // three calls in one frame → one re-render, state === 3
 * setRafState(1)
 * setRafState(2)
 * setRafState(3)
 */
export declare function useRafState<S>(
  initialState: S | (() => S),
): [S, Dispatch<SetStateAction<S>>]
```
