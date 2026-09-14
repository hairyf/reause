---
category: State
---

# useMap

A real `Map` whose mutations re-render — React port of react-hookz's `useMap`.

## Usage

```tsx
import { useMap } from '@reause/shared'

const map = useMap([['a', 1]])

map.set('b', 2) // re-renders; returns the same Map
map.get('b') // 2
map.size // 2
map.delete('a') // re-renders; returns true
map.clear() // re-renders; returns undefined
```

The returned value **is** the `Map` — not a tuple and not a wrapper object — so
`map instanceof Map` holds at the call site and `size`, `get`, `has`, iteration
and spread are the ordinary `Map` semantics. Only `set`, `delete` and `clear`
are replaced, each by an own method that applies the pristine `Map.prototype`
method and then triggers a re-render (through `@reause/shared`'s `useUpdate`,
where upstream calls react-hookz's own `useRerender`). `set` returns the patched
`Map` explicitly, as upstream does, `delete` returns the native boolean and
`clear` the native `undefined`.

The `Map` is created once, in a lazy ref initialiser, and keeps a stable
identity for the component's lifetime: `entries` is read only by that first
construction, so a later, changed `entries` argument is ignored (upstream does
the same). Mutating from inside a render body re-renders that pass immediately
and runs the mutation again, so an unguarded in-render `map.set(...)` loops
until React bails out with "Too many re-renders" — measured at 26 render
attempts before the throw, and it loops for a no-op mutation too (a `set` onto
an existing key, a `delete` of an absent key, a `clear` of an empty map),
because it is the dispatch that loops rather than the change. Mutate from
effects and event handlers instead.

This is a different hook from react-use's `useMap`, which is deliberately not
ported here: react-use returns a `[map, utils]` tuple over a plain object
(`T extends object`) whose `utils` are `{ get, set, setAll, remove, reset }` —
not a `Map` at all. Only react-hookz's shape is mirrored, so the two sources are
never conflated. Nothing touches `window` or `document` at import time or on the
first render, so the hook is safe to render on the server. Ported from
react-hookz's `source/react-hookz/src/useMap/` (`index.ts`,
`index.dom.test.ts`, `index.ssr.test.ts`); reause exports the hook by name, as
upstream does. The upstream documentation page
([react-hookz.github.io/web](https://react-hookz.github.io/web/)) was not
fetched while writing this port — unverified.

## Type Declarations

```ts
/**
 * Map from react-hookz `useMap`
 * (`source/react-hookz/src/useMap/`).
 *
 * @param entries Initial entries for the underlying `Map` constructor. Read
 * only by the first render; `null` and `undefined` both mean "empty".
 *
 * @example
 * const map = useMap([['a', 1]])
 * map.set('b', 2) // re-renders; returns the same Map
 * map.get('b') // 2
 * map.delete('a') // re-renders; returns true
 * map.size // 1
 */
export declare function useMap<K = any, V = any>(
  entries?: ReadonlyArray<readonly [K, V]> | null,
): Map<K, V>
```
