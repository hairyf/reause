import { useRef } from 'react'
import { useUpdate } from '../useUpdate'

// The pristine `Map.prototype` methods, captured once at module scope.
const proto = Map.prototype

/**
 * React port of react-hookz's `useMap`.
 *
 * Map from react-hookz `useMap` (`source/react-hookz/src/useMap/`)
 * Mapping: mirrors upstream — the returned value **is** the `Map`, not a tuple
 * and not a wrapper, so `map instanceof Map` holds at the call site and `size`,
 * `get`, `has` and iteration are the real `Map` semantics. Only `set`, `delete`
 * and `clear` are replaced by own methods; each one applies the pristine
 * `Map.prototype` method through `proto.*.apply(map, args)` and then asks
 * `@reause/shared`'s `useUpdate` for a re-render (upstream calls react-hookz's
 * own `useRerender`, which this port reuses rather than duplicating — see
 * `docs/orchestration.md`). The patch runs inside the lazy `useRef` init branch,
 * so the `Map` is constructed exactly once per component and keeps a stable
 * identity for the component's lifetime; `entries` is read **only** by that
 * first construction — a later, changed `entries` argument is ignored, exactly
 * as upstream ignores it, which is what makes the stable identity possible. The
 * patch calls the pristine prototype method rather than `map.set`, so it cannot
 * recurse into itself.
 *
 * The returned `set` returns the patched `Map` explicitly (`return map`), as
 * upstream does; `delete` returns the native boolean and `clear` the native
 * `undefined` (upstream returns neither explicitly, and this port mirrors that).
 *
 * A different shape from react-use's `useMap`, which is deliberately **not**
 * ported here: react-use returns a `[map, utils]` tuple over a plain object
 * (`T extends object`) whose `utils` are `{ get, set, setAll, remove, reset }`,
 * not a `Map` at all. Only react-hookz's shape is mirrored, so the two sources
 * are never conflated.
 *
 * Mutating from inside a render body **does** make React re-render that pass
 * immediately, and the re-render runs the mutation again — an unguarded
 * in-render `map.set(...)` loops until React bails out with "Too many
 * re-renders". Mutate from effects and event handlers, never from a render
 * body. (Upstream behaves the same way: its `useRerender` is a `useState`
 * dispatcher too.)
 *
 * Nothing touches `window` or `document` at import time or on the first render,
 * so the hook is SSR-safe. Upstream ships `useMap` as a named export too (every
 * react-hookz hook is one directory, `src/useMap/index.ts`); reause exports it
 * by name from `@reause/shared`.
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
export function useMap<K = any, V = any>(entries?: ReadonlyArray<readonly [K, V]> | null): Map<K, V> {
  const mapRef = useRef<Map<K, V>>(undefined)
  const update = useUpdate()

  if (!mapRef.current) {
    const map = new Map<K, V>(entries)

    mapRef.current = map

    map.set = (...args) => {
      proto.set.apply(map, args)
      update()
      return map
    }

    map.clear = (...args) => {
      proto.clear.apply(map, args)
      update()
    }

    map.delete = (...args) => {
      const existed = proto.delete.apply(map, args)
      update()

      return existed
    }
  }

  return mapRef.current
}
