import { useMemo, useRef } from 'react'
import { useUpdate } from '../useUpdate'

/**
 * react-use's `IHookStateInitAction<S>` — a value, or a zero-argument factory resolving to one
 * (`source/react-use/src/misc/hookState.ts`).
 *
 * Declaration decision: the pin *imports* this alias (and `IHookStateSetAction`) from
 * `misc/hookState` rather than defining it, and react-use's root barrel does not re-export either
 * name. reause has no `misc/hookState` module, so both aliases are declared here — next to their
 * only consumer, in the same file, with upstream's names — instead of porting that module:
 * `resolveHookState` below is the only other thing it contained, and the issue asks for one file
 * per hook. They are exported because `ListActions<T>` and the `useList` signature reference them
 * and a declaration build cannot name a private type.
 */
export type IHookStateInitAction<S> = S | (() => S)

/**
 * react-use's `IHookStateSetAction<S>` — a value, a one-argument updater receiving the current
 * list, or a zero-argument factory (see `IHookStateInitAction` above for why it is declared here).
 *
 * `IHookStateSetAction<T[]>` is structurally identical to React's `SetStateAction<T[]>` (`(() =>
 * S)` is assignable to `(prev: S) => S`), but the name is upstream's, so the emitted signature of
 * `ListActions['set']` reads exactly like the pin's.
 */
export type IHookStateSetAction<S> = S | ((prevState: S) => S) | (() => S)

/** Anything `resolveHookState` can resolve (react-use's `IHookStateResolvable`). */
type IHookStateResolvable<S> = IHookStateInitAction<S> | IHookStateSetAction<S>

/**
 * Resolve a value-or-action into its value, mirroring react-use's `resolveHookState`
 * (`source/react-use/src/misc/hookState.ts`) **including its arity rule**: when the action is a
 * function, react-use calls it with the current state only if it declares a parameter and with no
 * argument otherwise (`nextState.length ? nextState(currentState): nextState()`). The issue's
 * mapping note suggests reusing reause's `SetStateAction`-style resolution instead; that form
 * always passes the previous value to a function action, so it would silently change what a
 * zero-arity action observes through `arguments` — the pin wins, and the difference is measured by
 * the differential probe recorded in the PR. Both accepted forms are unaffected: a `() => next`
 * factory ignores the argument either way, and a `prev => next` updater still receives the current
 * list.
 *
 * Note the init action is typed `() => S` only, so a resolve without `currentState` can never reach
 * the parameterised branch through the public API; react-use's own overload accepts the wider union
 * there, and this port keeps the shared implementation so the behaviour stays identical.
 */
function resolveHookState<S>(nextState: IHookStateResolvable<S>, currentState?: S): S {
  if (typeof nextState !== 'function')
    return nextState

  const action = nextState as (prevState?: S) => S

  return action.length ? action(currentState) : action()
}

/**
 * The stable action set `useList` returns — mirrors react-use's exported `ListActions<T>` interface
 * member for member, including the deprecated `remove` alias and the declared parameter lists
 * (JSDoc descriptions are react-use's own, kept because they are the contract).
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
   * @description Replace item at given position. If item at given position not exists it will be
   * set.
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
  filter: (callbackFn: (value: T, index?: number, array?: T[]) => boolean, thisArg?: any) => void

  /**
   * @description Removes item at given position. All items to the right from removed will be
   * shifted.
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
 * Map from react-use `useList`.
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
export function useList<T>(initialList: IHookStateInitAction<T[]> = []): [T[], ListActions<T>] {
  // The list lives in a ref, not in state: the actions below read the freshest
  // value synchronously and stay referentially stable across renders. Like
  // upstream, `resolveHookState(initialList)` is evaluated on every render but
  // only the first result is kept — `useRef` ignores later arguments.
  const list = useRef(resolveHookState(initialList))
  // Upstream names this binding `update`, which is free there because its
  // actions live in one object literal; here each action is a named `const`
  // (the pin's single literal cannot be inferred under this tsconfig — its
  // members reference the object being declared, which TypeScript reports as
  // `TS7022`), so the force-render wears a distinct name.
  const rerender = useUpdate()

  const actions = useMemo<ListActions<T>>(() => {
    const set: ListActions<T>['set'] = (newList) => {
      list.current = resolveHookState(newList, list.current)
      rerender()
    }

    const push: ListActions<T>['push'] = (...items) => {
      // upstream: `items.length && actions.set(…)` — an empty push is a no-op,
      // so it neither re-renders nor replaces the list identity
      if (items.length)
        set(curr => curr.concat(items))
    }

    const updateAt: ListActions<T>['updateAt'] = (index, item) => {
      set((curr) => {
        const arr = curr.slice()

        arr[index] = item

        return arr
      })
    }

    const insertAt: ListActions<T>['insertAt'] = (index, item) => {
      set((curr) => {
        const arr = curr.slice()

        // beyond the end of the list there is nothing to shift, so upstream
        // *assigns* (leaving holes) instead of splicing
        if (index > arr.length)
          arr[index] = item
        else
          arr.splice(index, 0, item)

        return arr
      })
    }

    const update: ListActions<T>['update'] = (predicate, newItem) => {
      // `map` always produces a fresh array, even when no item matched —
      // upstream does not short-circuit, and the re-render is part of the
      // action's contract
      set(curr => curr.map(item => (predicate(item, newItem) ? newItem : item)))
    }

    const updateFirst: ListActions<T>['updateFirst'] = (predicate, newItem) => {
      const index = list.current.findIndex(item => predicate(item, newItem))

      if (index >= 0)
        updateAt(index, newItem)
    }

    const upsert: ListActions<T>['upsert'] = (predicate, newItem) => {
      const index = list.current.findIndex(item => predicate(item, newItem))

      if (index >= 0)
        updateAt(index, newItem)
      else
        push(newItem)
    }

    const sort: ListActions<T>['sort'] = (compareFn) => {
      set(curr => curr.slice().sort(compareFn))
    }

    // Non-generic on purpose: the pin's `ListActions<T>` declares `filter` as
    // the plain boolean predicate below (the implementation's `<S extends T>`
    // type-predicate form is erased by the pin's own `as ListActions<T>`
    // assertion), so this is the member both ports actually expose.
    const filter: ListActions<T>['filter'] = (callbackFn, thisArg) => {
      set(curr => curr.slice().filter(callbackFn, thisArg))
    }

    const removeAt: ListActions<T>['removeAt'] = (index) => {
      set((curr) => {
        const arr = curr.slice()

        arr.splice(index, 1)

        return arr
      })
    }

    const clear: ListActions<T>['clear'] = () => {
      set([])
    }

    const reset: ListActions<T>['reset'] = () => {
      set(resolveHookState(initialList).slice())
    }

    const a = { set, push, updateAt, insertAt, update, updateFirst, upsert, sort, filter, removeAt, clear, reset }

    // Upstream builds the object and then appends the deprecated alias
    // (`(a as ListActions<T>).remove = a.removeAt`), so `remove` is the *same
    // function reference* as `removeAt` and the *last* own key. Spreading keeps
    // both properties of that: `remove === removeAt` holds and `Object.keys`
    // reports the pin's order.
    /**
     * @deprecated Use removeAt method instead
     */
    return { ...a, remove: removeAt }
  }, [])

  return [list.current, actions]
}
