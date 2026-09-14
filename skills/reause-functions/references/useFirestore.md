---
category: '@Firebase'
---

# useFirestore

Reactive [Firestore](https://firebase.google.com/docs/firestore) binding. Making it straightforward to **always keep your local data in sync** with remotes databases.

## Usage

```tsx
import { useFirestore } from '@reause/firebase'
import { initializeApp } from 'firebase/app'
import { collection, doc, getFirestore, limit, orderBy, query } from 'firebase/firestore'

const app = initializeApp({ /* config */ })
const db = getFirestore(app)

const todos = useFirestore(collection(db, 'todos'))

// or for doc reference
const user = useFirestore(doc(db, 'users', 'my-user-id'))

// you can pass a new query reference to re-subscribe
const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(10))
const posts = useFirestore(postsQuery)

// you can use a boolean value to tell a query when it is ready to run
// when it gets falsy value, return the initial value
const userId = ''
const userQuery = userId && doc(db, 'users', userId)
const userData = useFirestore(userQuery, null)
```

## Return Value

- For **Document Reference**: Returns `T | null` (single document with `id` property)
- For **Query**: Returns `T[]` (array of documents, each with `id` property)

The document `id` is automatically added as a read-only property to each returned document.

## Options

| Option         | Type                   | Default         | Description                                                              |
| -------------- | ---------------------- | --------------- | ------------------------------------------------------------------------ |
| `errorHandler` | `(err: Error) => void` | `console.error` | Custom error handler                                                     |
| `autoDispose`  | `boolean \| number`    | `true`          | Auto-unsubscribe on unmount. Pass a number for delayed unsubscribe (ms). |

## Error Handling

```tsx
const todos = useFirestore(collection(db, 'todos'), [], {
  errorHandler: (err) => {
    console.error('Firestore error:', err)
    // Handle error (e.g., show notification)
  },
})
```

## Share across instances

You can reuse the db reference by passing `autoDispose: false`. You can also set an amount of milliseconds before auto disposing the db reference.

Note : Getting a not disposed db reference again don't cost a Firestore read.

```tsx
import { useFirestore } from '@reause/firebase'
import { collection } from 'firebase/firestore'
// ---cut---
const todos = useFirestore(collection(db, 'todos'), undefined, { autoDispose: false })
```

or share one subscription between components with `createSharedHook` from the shared package — the port of `createSharedComposable`. (Upstream's page recommends `createGlobalState`, but reause's `createGlobalState` mirrors react-use: its initial state is resolved at module scope, so it cannot host a hook.)

```ts
// store.ts
import { useFirestore } from '@reause/firebase'
import { createSharedHook } from '@reause/shared'
import { collection } from 'firebase/firestore'

export const useTodos = createSharedHook(
  () => useFirestore(collection(db, 'todos')),
)
```

## Type Declarations

```ts
export interface UseFirestoreOptions {
  /**
   * Custom error handler for Firestore subscription errors.
   *
   * @default (error) => console.error(error)
   */
  errorHandler?: (err: Error) => void
  /**
   * Automatically unsubscribe when the component unmounts. Pass a number to
   * delay the unsubscribe by that many milliseconds (upstream's
   * `useTimeoutFn`-based delayed dispose).
   *
   * @default true
   */
  autoDispose?: boolean | number
}
export type FirebaseDocRef<T> = Query<T> | DocumentReference<T>
type Falsy = false | 0 | "" | null | undefined
export declare function useFirestore<T extends DocumentData>(
  maybeDocRef: DocumentReference<T> | Falsy,
  initialValue: T,
  options?: UseFirestoreOptions,
): T | null
export declare function useFirestore<T extends DocumentData>(
  maybeDocRef: Query<T> | Falsy,
  initialValue: T[],
  options?: UseFirestoreOptions,
): T[]
export declare function useFirestore<T extends DocumentData>(
  maybeDocRef: DocumentReference<T> | Falsy,
  initialValue?: T | undefined | null,
  options?: UseFirestoreOptions,
): T | undefined | null
export declare function useFirestore<T extends DocumentData>(
  maybeDocRef: Query<T> | Falsy,
  initialValue?: T[],
  options?: UseFirestoreOptions,
): T[] | undefined
```
