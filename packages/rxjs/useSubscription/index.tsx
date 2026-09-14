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
 * Map from @vueuse/rxjs `useSubscription`
 * (`source/vueuse/packages/rxjs/useSubscription/`).
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
