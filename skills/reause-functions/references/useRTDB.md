---
category: '@Firebase'
---

# useRTDB

Reactive [Firebase Realtime Database](https://firebase.google.com/docs/database) binding. Making it straightforward to **always keep your local data in sync** with remotes databases.

## Usage

```tsx
import { useRTDB } from '@reause/firebase'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref } from 'firebase/database'

const app = initializeApp({ /* config */ })
const db = getDatabase(app)

const [todos, setTodos] = useRTDB<Record<string, Todo>>(ref(db, 'todos'))
```

## Options

| Option         | Type                   | Default         | Description                                               |
| -------------- | ---------------------- | --------------- | --------------------------------------------------------- |
| `autoDispose`  | `boolean`              | `true`          | Automatically unsubscribe when the component is unmounted |
| `errorHandler` | `(err: Error) => void` | `console.error` | Custom error handler for database errors                  |

## Return Value

Returns a `T | undefined` value that is automatically updated when the database value changes.

## Reusing Database References

You can reuse the db reference by passing `autoDispose: false`:

```tsx
const [todos] = useRTDB(ref(db, 'todos'), { autoDispose: false })
```

or share one subscription between components with `createSharedHook` from the shared package — the port of `createSharedComposable`. (Upstream's page recommends `createGlobalState`, but reause's `createGlobalState` mirrors react-use: its initial state is resolved at module scope, so it cannot host a hook.)

```ts
// store.ts
import { useRTDB } from '@reause/firebase'
import { createSharedHook } from '@reause/shared'
import { ref } from 'firebase/database'

export const useTodos = createSharedHook(
  () => useRTDB(ref(db, 'todos')),
)
```

## Type Declarations

```ts
export interface UseRTDBOptions {
  /**
   * Custom error handler for database errors.
   *
   * @default (error) => console.error(error)
   */
  errorHandler?: (err: Error) => void
  /**
   * Automatically unsubscribe from the database reference when the component
   * unmounts.
   *
   * @default true
   */
  autoDispose?: boolean
}
/**
 * Result tuple of `useRTDB`, mirroring upstream's writable Vue ref:
 * `[data, setData]`.
 */
export type UseRTDBReturn<T> = [
  data: T | undefined,
  setData: (value: T | undefined) => void,
]
/**
 * React port of VueUse's `useRTDB`.
 *
 * Map from @vueuse/firebase `useRTDB`
 *
 * Reactive [Firebase Realtime Database](https://firebase.google.com/docs/database)
 * binding — keeps local state in sync with a database reference. The listener
 * is registered with `onValue` in a mount effect and feeds `data` with
 * `snapshot.val()` on every database change.
 *
 * Adjustment for React:
 * - upstream returns a writable `Ref<T | undefined>`, so this port returns the
 *   `[data, setData]` tuple; `data` starts `undefined` and holds the latest
 *   snapshot value;
 * - `setData` writes **local state only** — it does not write to the Realtime
 *   Database (upstream's ref is equally local). Use the `firebase/database`
 *   write APIs (`set` / `update` / `push`) to persist;
 * - the subscription lives in a `useEffect` keyed on `docRef` and `autoDispose`,
 *   so a new `docRef` identity re-subscribes and unsubscribes the previous
 *   listener (upstream subscribes once per `setup()` — a deliberate
 *   React-idiomatic deviation);
 * - cleanup calls the `onValue` unsubscribe only when `autoDispose` is `true`
 *   (upstream parity). `autoDispose: false` means the subscription outlives the
 *   component: the caller gets no `off` handle and must live with the leak —
 *   discouraged, kept only for upstream parity;
 * - the latest `errorHandler` is read from a ref, so passing an inline handler
 *   does not re-subscribe.
 *
 * @see https://vueuse.org/useRTDB
 *
 * @example
 * const [todos, setTodos] = useRTDB<Record<string, Todo>>(ref(getDatabase(app), 'todos'))
 *
 * @__NO_SIDE_EFFECTS__
 */
export declare function useRTDB<T = any>(
  docRef: DatabaseReference,
  options?: UseRTDBOptions,
): UseRTDBReturn<T>
```
