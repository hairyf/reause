import { useRef } from 'react'
import { useUpdate } from '../useUpdate'

// The pristine `Set.prototype` methods, captured once at module scope.
const proto = Set.prototype

/**
 * React port of react-hookz's `useSet`.
 *
 * Map from react-hookz `useSet` (`source/react-hookz/src/useSet/`)
 * Mapping:, not a tuple and not a wrapper, so `set instanceof Set` holds at the call site and
 * `size`, `has` and iteration are the real `Set` semantics. Only `add`, `delete` and `clear` are
 * replaced by own methods; each one applies the pristine `Set.prototype` method through
 * `proto.*.apply(set, args)` and then asks `@reause/shared`'s `useUpdate` for a re-render (upstream
 * calls react-hookz's own `useRerender`, which this port reuses rather than duplicating — see
 * `docs/orchestration.md`). The patch runs inside the lazy `useRef` init branch, so the `Set` is
 * constructed exactly once per component and keeps a stable identity for the component's lifetime;
 * `values` is read **only** by that first construction — a later, changed `values` argument is
 * ignored, which is what makes the stable identity possible. The patch calls the pristine prototype
 * method rather than `set.add`, so it cannot recurse into itself.
 *
 * The returned `add` returns the patched `Set` explicitly (`return set`) even though native
 * `Set.prototype.add` also returns `this`; `delete` returns the native boolean and `clear` the
 * native `undefined`.
 *
 * There is **no `toggle`**. react-use ships a differently-shaped `useSet` that returns a `[set,
 * utils]` tuple with `{ add, remove, toggle, reset, clear }` helpers; that shape is deliberately
 * not the target here — only react-hookz's is mirrored, and react-hookz has no `toggle`. Compose
 * one from `has` plus `add` / `delete` if you need it.
 *
 * Mutating from inside a render body **does** make React re-render that pass immediately, and the
 * re-render runs the mutation again — an unguarded in-render `set.add(...)` loops until React bails
 * out with "Too many re-renders". Mutate from effects and event handlers, never from a render body.
 * (Upstream behaves the same way: its `useRerender` is a `useState` dispatcher too.)
 *
 * Nothing touches `window` or `document` at import time or on the first render, so the hook is
 * SSR-safe. Upstream ships `useSet` as a named export too (every react-hookz hook is one directory,
 * `src/useSet/index.ts`); reause exports it by name from `@reause/shared`.
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
export function useSet<T = any>(values?: readonly T[] | null): Set<T> {
  const setRef = useRef<Set<T>>(undefined)
  const update = useUpdate()

  if (!setRef.current) {
    const set = new Set<T>(values)

    setRef.current = set

    set.add = (...args) => {
      proto.add.apply(set, args)
      update()
      return set
    }

    set.clear = (...args) => {
      proto.clear.apply(set, args)
      update()
    }

    set.delete = (...args) => {
      const result = proto.delete.apply(set, args)
      update()
      return result
    }
  }

  return setRef.current
}
