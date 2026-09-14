---
category: State
---

# useList

Tracks an array and returns it with a stable set of immutable mutators — React port of react-use's `useList`.

## Usage

```tsx
import { useList } from '@reause/shared'

const [list, { push, updateAt, upsert, sort, filter, removeAt, clear, reset }] = useList([1, 2, 3])

push(4) // [1, 2, 3, 4]
updateAt(0, 9) // [9, 2, 3, 4]
upsert(item => item === 2, 7) // replaces the match → [9, 7, 3, 4]; pushes the item when nothing matches
sort((a, b) => b - a) // [9, 7, 4, 3]
filter(item => item > 3) // [9, 7, 4]
removeAt(0) // [7, 4]
clear() // []
reset() // [1, 2, 3]
```

`list` is the current array and every action both stores the new array and re-renders the component, so mutate the list through the actions rather than in place. The full action set is `set`, `push`, `updateAt`, `insertAt`, `update`, `updateFirst`, `upsert`, `sort`, `filter`, `removeAt`, `remove`, `clear` and `reset` — react-use's own names and parameter lists. `remove` is upstream's deprecated alias of `removeAt` and is kept as the very same function reference (`remove === removeAt`); prefer `removeAt`. `set` accepts a value, a `prev => next` updater or a `() => next` factory, resolved exactly as react-use's `resolveHookState` resolves them. react-use's standalone `useUpsert` is deliberately not ported — upstream deprecates it in favour of `useList`'s `upsert`.

**The actions object never changes identity.** The list itself lives in a `useRef` and each action writes the resolved next list into that ref and then asks `@reause/shared`'s `useUpdate` for a re-render, while the action object is built once in a `useMemo(…, [])` whose dependencies are literally empty. That is the port's action-identity contract, and it has two visible consequences: the actions are safe to pass to children or to leave out of a `useEffect` dependency array, and two actions sequenced inside one handler observe each other — `set([1, 2, 3, 4])` followed immediately by `upsert(v => v === 4, 9)` yields `[1, 2, 3, 9]`, because `upsert` reads the ref the `set` just wrote rather than the array React has not re-rendered yet. The two re-render requests are batched by React into a single render.

`initialList` may also be a factory, `useList(() => [1, 2, 3])`, and it is read only on the first render: a later change to the argument is ignored, and `reset` restores that first value (upstream's memoised behaviour). Upstream does not copy it, so on the first render the returned `list` **is** the array you passed in; pass a factory or a spread if you mutate your own array. `filter` mirrors upstream's declared action type — a type-predicate callback compiles but cannot narrow the list, which stays `T[]`.

Ported from react-use's `source/react-use/src/useList.ts` (157 LOC including `ListActions`, its `source/react-use/src/misc/hookState.ts` state actions and its `source/react-use/tests/useList.test.ts`). Upstream exports it as the default; reause exports the hook and its types by name. The pin's docs page `source/react-use/docs/useList.md` was read from the checkout; no URL was fetched while writing this page.

## Type Declarations

```ts
/**
 * react-use's `IHookStateInitAction<S>` — a value, or a zero-argument factory
 * resolving to one (`source/react-use/src/misc/hookState.ts`).
 *
 * Declaration decision: the pin *imports* this alias (and
 * `IHookStateSetAction`) from `misc/hookState` rather than defining it, and
 * react-use's root barrel does not re-export either name. reause has no
 * `misc/hookState` module, so both aliases are declared here — next to their
 * only consumer, in the same file, with upstream's names — instead of porting
 * that module: `resolveHookState` below is the only other thing it contained,
 * and the issue asks for one file per hook. They are exported because
 * `ListActions<T>` and the `useList` signature reference them and a
 * declaration build cannot name a private type.
 */
export type IHookStateInitAction<S> = S | (() => S)
/**
 * react-use's `IHookStateSetAction<S>` — a value, a one-argument updater
 * receiving the current list, or a zero-argument factory (see
 * `IHookStateInitAction` above for why it is declared here).
 *
 * `IHookStateSetAction<T[]>` is structurally identical to React's
 * `SetStateAction<T[]>` (`(() => S)` is assignable to `(prev: S) => S`), but
 * the name is upstream's, so the emitted signature of `ListActions['set']`
 * reads exactly like the pin's.
 */
export type IHookStateSetAction<S> = S | ((prevState: S) => S) | (() => S)
/**
 * The stable action set `useList` returns — mirrors react-use's exported
 * `ListActions<T>` interface member for member, including the deprecated
 * `remove` alias and the declared parameter lists (JSDoc descriptions are
 * react-use's own, kept because they are the contract).
 */
export interface ListActions<T> {
  /**
   * @description Set new list instead old one
   */
  set: (newList: IHookStateSetAction<T[]>) => void
  /**
   * @description Add item(s) at the end of list
   */
  push: (...items: T[]) => void
  /**
   * @description Replace item at given position. If item at given position not exists it will be set.
   */
  updateAt: (index: number, item: T) => void
  /**
   * @description Insert item at given position, all items to the right will be shifted.
   */
  insertAt: (index: number, item: T) => void
  /**
   * @description Replace all items that matches predicate with given one.
   */
  update: (predicate: (a: T, b: T) => boolean, newItem: T) => void
  /**
   * @description Replace first item matching predicate with given one.
   */
  updateFirst: (predicate: (a: T, b: T) => boolean, newItem: T) => void
  /**
   * @description Like `updateFirst` bit in case of predicate miss - pushes item to the list
   */
  upsert: (predicate: (a: T, b: T) => boolean, newItem: T) => void
  /**
   * @description Sort list with given sorting function
   */
  sort: (compareFn?: (a: T, b: T) => number) => void
  /**
   * @description Same as native Array's method
   */
  filter: (
    callbackFn: (value: T, index?: number, array?: T[]) => boolean,
    thisArg?: any,
  ) => void
  /**
   * @description Removes item at given position. All items to the right from removed will be shifted.
   */
  removeAt: (index: number) => void
  /**
   * @deprecated Use removeAt method instead
   */
  remove: (index: number) => void
  /**
   * @description Make the list empty
   */
  clear: () => void
  /**
   * @description Reset list to initial value
   */
  reset: () => void
}
/**
 * Tracks an array and returns it with a stable set of immutable mutators —
 * React port of react-use's `useList`.
 *
 * Map from react-use `useList`
 * Mapping: mirrored 1:1 — upstream's argument type, its `[list, actions]`
 * tuple and all thirteen actions (`set`, `push`, `updateAt`, `insertAt`,
 * `update`, `updateFirst`, `upsert`, `sort`, `filter`, `removeAt`, `remove`,
 * `clear`, `reset`) keep their names, parameter lists and semantics, and the
 * deprecated `remove` is kept rather than dropped: it is a straight alias of
 * `removeAt` in the pin (assigned after the action object is built, so
 * `remove === removeAt`), and a port that omitted it would break API parity
 * for the sake of a deprecation notice. react-use's standalone `useUpsert` is
 * **not** ported — upstream itself marks it `@deprecated Use useList hook's
 * upsert action instead`; `upsert(predicate, item)` below is that supersession.
 *
 * **Action identity is part of the contract.** The list lives in a `useRef`
 * (`list.current`) and every action writes the resolved next list into that ref
 * and *then* asks for a re-render, while the action object comes from a
 * `useMemo(…, [])`. That is what makes the actions referentially stable across
 * renders and what lets `updateFirst` / `upsert` read the freshest list
 * synchronously, in the same event handler, before React has re-rendered. The
 * actions are therefore safe to pass to children or to omit from a
 * `useEffect` dependency array. Do not "improve" this into `useState`: with
 * state in the render slot, `useMemo` would have to depend on the list (so the
 * actions would change identity) and a sequenced `set(…)` then `upsert(…)`
 * inside one handler would read the *stale* list — both are asserted in the
 * tests. The re-render request is `@reause/shared`'s `useUpdate` (react-use
 * ships its own `useUpdate`, reused here rather than duplicated, the same
 * disposition the `useSet` / `useMap` ports took).
 *
 * Consequence of the ref design, measured rather than assumed: `set` resolves
 * and stores its next list **synchronously**, so two actions inside one handler
 * observe each other's writes, while the two `useUpdate` dispatches they issue
 * are batched by React into a single re-render.
 *
 * Resolution follows react-use's `resolveHookState`: an action may be a value,
 * a `prev => next` updater, or a `() => next` factory (upstream's arity rule —
 * see `resolveHookState` above). `reset` re-resolves the **first render's**
 * `initialList` (the `useMemo(…, [])` closure of the pin) and `.slice()`s it, so
 * a later change to the argument neither affects `reset` nor aliases the
 * caller's array. The initial list itself is *not* copied: exactly as upstream,
 * on the first render `list` **is** the array passed in, so mutating that array
 * directly mutates the returned list without a re-render (the hook's contract
 * is to go through the actions) — callers who care should pass a factory or a
 * spread.
 *
 * `filter` mirrors the pin's declared `ListActions<T>` member, not the pin's
 * internal generic implementation: upstream types it
 * `(callbackFn: (value: T, index?: number, array?: T[]) => boolean, thisArg?: any) => void`
 * and casts the implementation to that interface, so a type predicate such as
 * `filter((x): x is S => …)` compiles (a predicate is assignable to `boolean`)
 * but cannot narrow anything — the action returns `void` and the list stays
 * `T[]`. The `thisArg` parameter is passed straight to `Array.prototype.filter`.
 *
 * Nothing touches `window` or `document` at import time or on the first render,
 * so the hook is SSR-safe. Upstream default-exports `useList` (and its root
 * barrel re-exports only the default, not `ListActions`); reause exports the hook
 * and its types by name from `@reause/shared`.
 *
 * @param initialList Initial list, or a zero-argument factory producing one.
 * Read only on the first render: a later, changed argument is ignored (upstream
 * ignores it the same way — `reset` still targets the first render's value).
 *
 * @example
 * const [list, { push, updateAt, upsert, sort, filter, reset }] = useList([1, 2, 3])
 *
 * push(4) // [1, 2, 3, 4]
 * updateAt(0, 9) // [9, 2, 3, 4]
 * upsert(a => a === 2, 7) // replaces the match → [9, 7, 3, 4]; pushes when unmatched
 * sort((a, b) => b - a) // [9, 7, 4, 3]
 * filter(a => a > 3) // [9, 7, 4]
 * reset() // [1, 2, 3]
 *
 * @see source/react-use/docs/useList.md (the pin's docs page, read directly
 * rather than fetched from a URL)
 */
export declare function useList<T>(
  initialList?: IHookStateInitAction<T[]>,
): [T[], ListActions<T>]
```
