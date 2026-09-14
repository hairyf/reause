import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'

/**
 * Make a composable function usable with multiple React components.
 *
 * Map from @vueuse/shared `createSharedComposable`
 * Mapping: upstream runs the composable once inside a detached `effectScope(true)`, counts the
 * subscribers and stops the scope when the last consumer leaves. React has no `effectScope`, so the
 * same lifetime is expressed by an external store held in the closure of one `createSharedHook`
 * call — the `state` snapshot, a `Set` of `listeners`, the `refCount` and the optional `cleanup` —
 * which every consumer reads through `useSyncExternalStore`.
 *
 * The shared instance is created by the **first consumer to render** (the "creator"): it runs the
 * wrapped hook on every one of its renders — the wrapped hook is therefore free to use React hooks
 * internally — assigning the result to `state`, and `useLayoutEffect` publishes the latest value to
 * every other consumer after commit. Every later consumer never calls the wrapped hook (both call
 * patterns are stable per consumer, so the hook order never changes across renders); it just reads
 * the published snapshot. The creator assigns `state` *before* `useSyncExternalStore` reads its
 * snapshot in the same render, so every consumer — creator included — receives the shared value on
 * its very first render, never `undefined`.
 *
 * The creator deliberately **does not register a store listener**: it already re-renders on its own
 * state changes (the wrapped hook's setters belong to its component) and re-publishes afterwards,
 * so a notification would only re-render it from its own publish. `useSyncExternalStore` requires
 * the snapshot to stay reference-stable between real changes ("the result of getSnapshot should be
 * cached"): every creator render assigns a fresh reference, so a subscribed creator would see "the
 * store changed" forever and loop. The creator still counts toward `refCount`, so teardown timing
 * is exact — it just never receives notifications.
 *
 * Deviations from upstream:
 * - upstream runs the composable exactly once, with the first caller's
 *   arguments; here the creator re-runs the wrapped hook on every one of its
 *   renders (React hooks cannot be called outside a render), so while the
 *   creator stays mounted the shared value keeps tracking its latest render.
 * - **frozen after the creator unmounts**: the wrapped hook's setters belong
 *   to the creator's component, so if the creator unmounts while other
 *   consumers remain mounted, the shared value stops updating — it freezes at
 *   the last published value. The instance itself lives on until the last
 *   consumer unmounts (upstream lifetime parity).
 * - `getServerSnapshot` returns the same snapshot as the client: server
 *   rendering yields the uninitialized value, the client fills it in after
 *   hydration, and `useSyncExternalStore` handles the mismatch.
 * - Teardown has no `tryOnScopeDispose` to hook into, so the optional
 *   `cleanup` argument is called — and the state dropped — when the last
 *   consumer unmounts; a later mount starts a fresh instance, exactly like
 *   upstream's `scope.stop()` followed by `state = undefined`.
 *
 * ```tsx
 * const useSharedMouse = createSharedHook(useMouse)
 *
 * // CompA — const { x, y } = useSharedMouse()
 * // CompB — const { x, y } = useSharedMouse() // same state, no new listeners
 * ```
 *
 * @see https://vueuse.org/createSharedComposable
 * @param hook The composable to share across every consumer of the returned
 * hook. It runs on every render of the first consumer (the creator).
 * @param cleanup Called when the last consumer unmounts, before the shared
 * state is dropped — the place to undo whatever `hook` set up outside React.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createSharedHook<Fn extends (...args: any[]) => any>(
  hook: Fn,
  cleanup?: () => void,
): (...args: Parameters<Fn>) => ReturnType<Fn> {
  // the whole shared instance lives in this closure: one per
  // `createSharedHook` call, shared by every consumer of the returned hook
  let state: ReturnType<Fn> | undefined
  const listeners = new Set<() => void>()
  let refCount = 0
  let teardown = cleanup
  // which consumer created the instance — the first one to render. It is the
  // only consumer allowed to call the wrapped hook, so the hook order stays
  // stable for every consumer: the creator calls it on every render, the
  // others never do.
  let creatorId: symbol | undefined

  const notify = (): void => {
    for (const listener of listeners)
      listener()
  }

  // stable for the lifetime of the shared instance — that stability is what
  // keeps `useSyncExternalStore` from re-subscribing on every render
  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    refCount += 1

    return () => {
      listeners.delete(listener)
      refCount -= 1

      // last consumer gone: tear the instance down, like upstream's
      // `scope.stop()` followed by `state = undefined`
      if (refCount <= 0) {
        state = undefined
        refCount = 0
        creatorId = undefined
        teardown?.()
        teardown = undefined
      }
    }
  }

  // the creator never registers a listener (see the note in the JSDoc): it
  // re-renders on its own state changes and re-publishes, so store
  // notifications would only loop it back into a render — `getSnapshot`
  // returns a fresh reference after every creator render, so its own listener
  // would see "the store changed" forever. It is still counted, so teardown
  // runs exactly when the last consumer — creator or not — unmounts.
  const creatorSubscribe = (_listener: () => void): (() => void) => {
    refCount += 1

    return () => {
      refCount -= 1

      if (refCount <= 0) {
        state = undefined
        refCount = 0
        creatorId = undefined
        teardown?.()
        teardown = undefined
      }
    }
  }

  const getSnapshot = (): ReturnType<Fn> | undefined => state

  // SSR: keep it simple — the server renders the uninitialized snapshot, the
  // client fills it in after hydration, and `useSyncExternalStore` handles
  // the mismatch (see the deviations note above)
  const getServerSnapshot = getSnapshot

  return function useSharedHook(...args: Parameters<Fn>): ReturnType<Fn> {
    const id = useRef(Symbol('createSharedHook')).current
    if (creatorId === undefined)
      creatorId = id
    const isCreator = creatorId === id

    // the creator runs the wrapped hook on every render (stable hook order);
    // the other consumers never call it (also stable). Assigning `state`
    // during render is safe: it only feeds `useSyncExternalStore`'s snapshot
    // for the very same commit, so the first render already returns the real
    // value and no consumer ever sees `undefined`.
    if (isCreator)
      state = hook(...args)

    // publish the creator's latest value after commit — never notify during
    // a render
    useLayoutEffect(() => {
      if (isCreator)
        notify()
    })

    return useSyncExternalStore(
      isCreator ? creatorSubscribe : subscribe,
      getSnapshot,
      getServerSnapshot,
    ) as ReturnType<Fn>
  }
}
