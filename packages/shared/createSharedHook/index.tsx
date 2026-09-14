import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'

/**
 * Map from @vueuse/shared `createSharedComposable`.
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
