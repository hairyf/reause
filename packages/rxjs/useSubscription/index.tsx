import { useEffect } from 'react'

/**
 * Anything with an RxJS-style `unsubscribe` — upstream types the argument as `Unsubscribable`,
 * which is written structurally here because `rxjs@6` (the version this package resolves, `rxjs`
 * stays a `>=6.0.0` peer) keeps that interface in `rxjs/internal/types` instead of re-exporting it
 * from the package root. A structural type accepts `rxjs@6`'s and `rxjs@7`'s `Unsubscribable` /
 * `Subscription` alike and keeps the peer range honest.
 */
export interface UnsubscribableLike {
  unsubscribe: () => void
}

/**
 * Use an RxJS [`Subscription`](https://rxjs.dev/guide/subscription) without worrying about
 * unsubscribing from it or creating memory leaks.
 *
 * Map from @vueuse/rxjs `useSubscription`
 * (`source/vueuse/packages/rxjs/useSubscription/`): the subscription is handed
 * to the hook and torn down automatically when the component unmounts, so the call site never needs
 * its own cleanup.
 *
 * React divergences:
 * - the effect cleanup: the subscription lives from mount until unmount. There is no state, so the
 * hook returns nothing (upstream parity).
 * - like `useObservable` (`packages/rxjs/useObservable/index.tsx`), the
 *   argument is deliberately **not** an effect dependency — a new `subscription`
 *   identity on a later render does not re-subscribe (Vue's
 *   `tryOnScopeDispose` also registers exactly once, during `setup`). Create
 *   the subscription with `useState`'s lazy initializer, `useRef` or a module
 *   scope when the surrounding component re-renders.
 * - SSR-safe: nothing touches `window` / `document`, and the cleanup only runs
 *   on real unmount.
 *
 * @see https://vueuse.org/rxjs/useSubscription/
 * @example
 * const [count, setCount] = useState(0)
 * useSubscription(interval(1000).subscribe(() => setCount(c => c + 1)))
 * // unsubscribes when the component unmounts
 */
export function useSubscription(subscription: UnsubscribableLike): void {
  useEffect(() => {
    // Upstream `tryOnScopeDispose(() => subscription.unsubscribe())`.
    return () => subscription.unsubscribe()
  }, [])
}
