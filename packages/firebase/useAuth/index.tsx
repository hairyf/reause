import type { Auth, Unsubscribe, User } from 'firebase/auth'
import { useEffect, useRef, useState } from 'react'

export interface UseAuthOptions {
  /**
   * Custom error handler for auth subscription errors.
   *
   * @default (error) => console.error(error)
   */
  errorHandler?: (err: Error) => void
}

/**
 * Result object of `useAuth` — the plain-value counterpart of upstream's `{ isAuthenticated, user
 * }` refs, plus the `loading` and `error` states.
 */
export interface UseAuthReturn {
  /**
   * Whether a user is currently authenticated (upstream's `isAuthenticated` computed): `true`
   * whenever `user` is not `null`.
   */
  isAuthenticated: boolean

  /**
   * The current Firebase user, or `null` if not authenticated (upstream's `user` ref). Seeded from
   * `auth.currentUser` and kept in sync by `onIdTokenChanged`.
   */
  user: User | null

  /**
   * Whether the auth state is still being resolved: `true` on the first render and until
   * `onIdTokenChanged` reports the current state (or the subscription fails), then `false` —
   * including when the reported state is signed out.
   */
  loading: boolean

  /**
   * The error thrown while subscribing to `auth.onIdTokenChanged`, or `null`.
   */
  error: Error | null
}

/**
 * Map from @vueuse/firebase/useAuth
 * (`source/vueuse/packages/firebase/useAuth/`).
 *
 * @see https://vueuse.org/firebase/useAuth/
 *
 * @example
 * const auth = getAuth(app)
 * const { isAuthenticated, user, loading, error } = useAuth(auth)
 * if (loading) return <div>Loading...</div>
 * if (!isAuthenticated) return <div>Please log in</div>
 * return <div>Welcome, {user.displayName}</div>
 *
 * @__NO_SIDE_EFFECTS__
 */
export function useAuth(auth: Auth, options: UseAuthOptions = {}): UseAuthReturn {
  const { errorHandler = (err: Error) => console.error(err) } = options

  // upstream parity: the ref starts at `auth.currentUser`, so an existing
  // session is visible before the listener fires for the first time
  const [user, setUser] = useState<User | null>(() => auth.currentUser)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Keep the latest `errorHandler` in a ref: the subscription below reads it
  // when subscribing fails, so an inline handler passed on every render never
  // re-subscribes.
  const errorHandlerRef = useRef(errorHandler)
  useEffect(() => {
    errorHandlerRef.current = errorHandler
  }, [errorHandler])

  // The `auth` instance the state above was seeded from. A different instance
  // means the current user/loading/error describe the previous one and must be
  // replaced by its own initial state.
  const subscribedAuthRef = useRef(auth)

  // Subscribe on mount and re-subscribe when the `auth` instance changes.
  // `onIdTokenChanged` fires once immediately with the current state (sign-in,
  // sign-out and token refresh all land on the same listener), which is what
  // resolves `loading`. Cleanup unsubscribes, so no listener outlives the
  // component (upstream leaks it).
  useEffect(() => {
    if (subscribedAuthRef.current !== auth) {
      subscribedAuthRef.current = auth
      setUser(auth.currentUser)
      setLoading(true)
      setError(null)
    }

    let unsubscribe: Unsubscribe | undefined
    let active = true

    try {
      unsubscribe = auth.onIdTokenChanged((authUser) => {
        // a callback delivered after unmount or after a re-subscribe belongs to
        // a superseded listener and must not write stale state
        if (!active)
          return
        setUser(authUser)
        setLoading(false)
      })
    }
    catch (err) {
      const subscriptionError = err instanceof Error ? err : new Error(String(err))
      setError(subscriptionError)
      // no callback will ever arrive — do not leave the caller on a loading screen
      setLoading(false)
      errorHandlerRef.current(subscriptionError)
    }

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [auth])

  return {
    isAuthenticated: user !== null,
    user,
    loading,
    error,
  }
}
