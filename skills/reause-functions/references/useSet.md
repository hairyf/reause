---
category: State
---

# useSet

A real `Set` whose mutations re-render — React port of react-hookz's `useSet`.

## Usage

```tsx
import { useSet } from '@reause/shared'

const set = useSet(['a'])

set.add('b') // re-renders; returns the same Set
set.has('b') // true
set.size // 2
set.delete('a') // re-renders; returns true
set.clear() // re-renders; returns undefined
```

The returned value **is** the `Set` — not a tuple and not a wrapper object — so
`set instanceof Set` holds at the call site and `size`, `has`, iteration and
spread are the ordinary `Set` semantics. Only `add`, `delete` and `clear` are
replaced, each by an own method that applies the pristine `Set.prototype`
method and then triggers a re-render (through `@reause/shared`'s `useUpdate`,
where upstream calls react-hookz's own `useRerender`). `add` returns the patched
`Set` explicitly, `delete` returns the native boolean and `clear` the native
`undefined`.

The `Set` is created once, in a lazy ref initialiser, and keeps a stable
identity for the component's lifetime: `values` is read only by that first
construction, so a later, changed `values` argument is ignored (upstream does
the same). Mutating from inside a render body re-renders that pass immediately
and runs the mutation again, so an unguarded in-render `set.add(...)` loops
until React bails out with "Too many re-renders" — mutate from effects and event
handlers instead.

There is no `toggle` here. react-use ships a differently-shaped `useSet`
returning `[set, utils]` with `{ add, remove, toggle, reset, clear }`; this port
mirrors react-hookz only, and react-hookz has no `toggle`, so its absence is the
intended shape rather than an omission. Compose one from `has` plus `add` /
`delete` if you need it. Nothing touches `window` or `document` at import time
or on the first render, so the hook is safe to render on the server.

Ported from react-hookz's `source/react-hookz/src/useSet/` (`index.ts`,
`index.dom.test.ts`, `index.ssr.test.ts`); reause exports the hook by name, as
upstream does. The upstream documentation page
([react-hookz.github.io/web](https://react-hookz.github.io/web/)) was not
fetched while writing this port — unverified.

## Type Declarations

```ts
/**
 * React port of react-hookz's `useSet`.
 *
 * Map from react-hookz `useSet` (`source/react-hookz/src/useSet/`)
 * Mapping: mirrors upstream — the returned value **is** the `Set`, not a tuple
 * and not a wrapper, so `set instanceof Set` holds at the call site and `size`,
 * `has` and iteration are the real `Set` semantics. Only `add`, `delete` and
 * `clear` are replaced by own methods; each one applies the pristine
 * `Set.prototype` method through `proto.*.apply(set, args)` and then asks
 * `@reause/shared`'s `useUpdate` for a re-render (upstream calls react-hookz's
 * own `useRerender`, which this port reuses rather than duplicating — see
 * `docs/orchestration.md`). The patch runs inside the lazy `useRef` init branch,
 * so the `Set` is constructed exactly once per component and keeps a stable
 * identity for the component's lifetime; `values` is read **only** by that
 * first construction — a later, changed `values` argument is ignored, exactly
 * as upstream ignores it, which is what makes the stable identity possible. The
 * patch calls the pristine prototype method rather than `set.add`, so it cannot
 * recurse into itself.
 *
 * The returned `add` returns the patched `Set` explicitly (`return set`) even
 * though native `Set.prototype.add` also returns `this`; `delete` returns the
 * native boolean and `clear` the native `undefined`.
 *
 * There is **no `toggle`**. react-use ships a differently-shaped `useSet` that
 * returns a `[set, utils]` tuple with `{ add, remove, toggle, reset, clear }`
 * helpers; that shape is deliberately not the target here — only react-hookz's
 * is mirrored, and react-hookz has no `toggle`. Compose one from `has` plus
 * `add` / `delete` if you need it.
 *
 * Mutating from inside a render body **does** make React re-render that pass
 * immediately, and the re-render runs the mutation again — an unguarded
 * in-render `set.add(...)` loops until React bails out with "Too many
 * re-renders". Mutate from effects and event handlers, never from a render
 * body. (Upstream behaves the same way: its `useRerender` is a `useState`
 * dispatcher too.)
 *
 * Nothing touches `window` or `document` at import time or on the first render,
 * so the hook is SSR-safe. Upstream ships `useSet` as a named export too (every
 * react-hookz hook is one directory, `src/useSet/index.ts`); reause exports it
 * by name from `@reause/shared`.
 *
 * @param values Initial values for the underlying `Set` constructor. Read only
 * by the first render; `null` and `undefined` both mean "empty".
 *
 * @example
 * const set = useSet(['a'])
 * set.add('b') // re-renders; returns the same Set
 * set.has('b') // true
 * set.delete('a') // re-renders; returns true
 * set.size // 1
 */
export declare function useSet<T = any>(values?: readonly T[] | null): Set<T>
```
