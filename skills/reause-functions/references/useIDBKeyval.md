---
category: '@Integrations'
---

# useIDBKeyval

Wrapper for [`idb-keyval`](https://www.npmjs.com/package/idb-keyval).

## Install idb-keyval as a peer dependency

```bash
npm i idb-keyval@^6
```

## Usage

```tsx
import { useIDBKeyval } from '@reause/integrations'

// bind object
const [storedObject, setStoredObject, { isFinished }] = useIDBKeyval('my-idb-keyval-store', {
  hello: 'hi',
  greeting: 'Hello',
})

// update object — explicit write (no deep watcher)
setStoredObject({ ...storedObject, hello: 'hola' })

// bind boolean
const [flag] = useIDBKeyval('my-flag', true)

// bind number
const [count, setCount] = useIDBKeyval('my-count', 0)

// awaiting the IDB transaction
await setCount(10)
console.log('IDB transaction finished!')

// delete data from the idb store
await setStoredObject(null)
```

## Cross-tab syncing

Changes are automatically synced across browser tabs using the [`BroadcastChannel` API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel). This is enabled by default and can be disabled via the `listenToStorageChanges` option.

```tsx
// disable cross-tab syncing
const [data] = useIDBKeyval('my-key', 'default', { listenToStorageChanges: false })
```

## Type Declarations

```ts
/**
 * Custom (de)serialization between the value held in state and the raw value stored in IndexedDB.
 * Defaults to an identity pair.
 */
export interface UseIDBKeyvalSerializer<T> {
  read: (raw: unknown) => T
  write: (value: T) => unknown
}
export interface UseIDBOptions<T> {
  /**
   * Allow a custom `window` instance, e.g. working with iframes or in testing environments.
   */
  window?: Window
  /**
   * On error callback.
   *
   * @default (error) => console.error(error)
   */
  onError?: (error: unknown) => void
  /**
   * Write the default value to the store when the key does not exist.
   *
   * @default true
   */
  writeDefaults?: boolean
  /**
   * Custom data serialization.
   */
  serializer?: UseIDBKeyvalSerializer<T>
  /**
   * Listen to changes from other tabs through a `BroadcastChannel`, useful for multi-tab
   * applications.
   *
   * @default true
   */
  listenToStorageChanges?: boolean
  /**
   * Watch for deep changes.
   *
   * Accepted for upstream parity only — **no effect**: React has no deep observation, so writes
   * happen explicitly through `setData` (see the divergence notes on `useIDBKeyval`).
   *
   * @default true
   */
  deep?: boolean
  /**
   * Use a shallow reference.
   *
   * Accepted for upstream parity only — **no effect**: React state is always replaced wholesale.
   *
   * @default false
   */
  shallow?: boolean
  /**
   * The flush timing of the (upstream) watcher.
   *
   * Accepted for upstream parity only — **no effect**: React has no watcher to flush, so writes
   * happen explicitly through `setData` (see the divergence notes on `useIDBKeyval`).
   *
   * @default 'pre'
   */
  flush?: "pre" | "post" | "sync" | "async"
}
/**
 * Reactive companion state of `useIDBKeyval` — the React replacement for the upstream `isFinished`
 * / `isSupported` refs (issue §2B tuple family).
 */
export interface UseIDBKeyvalControls {
  /**
   * Whether the initial read from the store has finished (successfully or with an error).
   */
  isFinished: boolean
  /**
   * Whether the `BroadcastChannel` API is available in the current browser.
   */
  isSupported: boolean
}
/**
 * React return type: `[data, setData, controls]` — the state-like tuple family used by
 * `useStateWithControl` and `useStorage` (issue §2B). `data` is `T | null` where `null` means the
 * key was removed from the store.
 */
export type UseIDBKeyvalReturn<T> = [
  data: T | null,
  setData: (value: T | null) => Promise<void>,
  controls: UseIDBKeyvalControls,
]
/**
 * Map from @vueuse/integrations `useIDBKeyval`
 * (`source/vueuse/packages/integrations/useIDBKeyval/`).
 *
 * @__NO_SIDE_EFFECTS__
 * @example
 * const [data, setData, { isFinished, isSupported }] = useIDBKeyval('my-store', { count: 0 })
 *
 * // explicit write (no deep watcher)
 * setData({ count: 1 })
 *
 * // remove the key
 * await setData(null)
 *
 * @see https://vueuse.org/integrations/useIDBKeyval/
 */
export declare function useIDBKeyval<T>(
  key: IDBValidKey,
  initialValue: T,
  options?: UseIDBOptions<T>,
): UseIDBKeyvalReturn<T>
```
