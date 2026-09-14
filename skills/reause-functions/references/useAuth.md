---
category: '@Firebase'
---

# useAuth

Reactive [Firebase Auth](https://firebase.google.com/docs/auth) binding. It provides a controllable `user` state and `isAuthenticated` flag so you
can easily react to changes in the users' authentication status.

## Usage

```tsx
import { useAuth } from '@reause/firebase'
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const app = initializeApp({ /* config */ })
const auth = getAuth(app)

function Profile() {
  // 1. 直接传入 auth 实例
  const { isAuthenticated, user, loading, error } = useAuth(auth)

  if (loading)
    return <div>Loading...</div>
  if (error)
    return <div>{`Auth error: ${error.message}`}</div>
  if (!isAuthenticated)
    return <div>Please log in</div>

  return <div>{`Welcome, ${user?.displayName}`}</div>
}

const signIn = () => signInWithPopup(auth, new GoogleAuthProvider())
```

## Return Values

| Name              | Type            | Description                                                                                        |
| ----------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| `user`            | `User \| null`  | The current Firebase user, or `null` if not authenticated                                          |
| `isAuthenticated` | `boolean`       | Whether a user is currently authenticated                                                          |
| `loading`         | `boolean`       | Whether the auth state is still being resolved — `true` until `onIdTokenChanged` reports the state |
| `error`           | `Error \| null` | The error thrown while subscribing to `onIdTokenChanged`, or `null`                                |

The hook automatically updates when the user's ID token changes (including sign-in, sign-out, and token refresh events) using Firebase's `onIdTokenChanged` listener.

## Type Declarations

```ts
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
export declare function useAuth(
  auth: Auth,
  options?: UseAuthOptions,
): UseAuthReturn
```
