---
category: State
---

# useStorageAsync

Reactive Storage with async support.

## Usage

The basic usage refers to [`useStorage`](/core/useStorage/).

```tsx
import { useStorageAsync } from '@reause/core'

const [accessToken, setAccessToken] = useStorageAsync('access.token', '', SomeAsyncStorage)

// accessToken may be empty before the async storage is ready
console.log(accessToken) // ""
```

## Wait First Loaded

When the user enters your app, `useStorageAsync()` starts loading the value
from an async storage, so you may get the default initial value instead of the
real stored value at the very beginning.

```tsx
import { useStorageAsync } from '@reause/core'

const [accessToken, setAccessToken] = useStorageAsync('access.token', '', SomeAsyncStorage)

// accessToken may be empty before the async storage is ready
console.log(accessToken) // ""

setTimeout(() => {
  // In React this closure captured the first render — the loaded value
  // arrives on a re-render and cannot be read from here. Use the `onReady`
  // option below to act on the loaded value.
  console.log(accessToken) // "" — the first render value, unchanged
}, 500)
```

Upstream lets you wait for the storage to be prepared by `await`-ing the
returned ref. In React the tuple cannot be awaited; instead the `onReady`
callback fires once the first value has been loaded:

```tsx
const [accessToken, setAccessToken] = useStorageAsync('access.token', '', SomeAsyncStorage, {
  onReady(value) {
    // accessToken has loaded — safe to mount the app now
  },
})
```

## Type Declarations

```ts
type Awaitable<T> = T | Promise<T>
/**
 * Custom data serialization with async support — `read`/`write` may return a promise for backends
 * that need asynchronous (de)serialization.
 */
export interface SerializerAsync<T> {
  read: (raw: string) => Awaitable<T>
  write: (value: T) => Awaitable<string>
}
/**
 * Minimal async storage backend contract — like `StorageLike`, but every operation may return a
 * promise (IndexedDB, remote key-value stores, async wrappers around `localStorage`, …).
 */
export interface StorageLikeAsync {
  getItem: (key: string) => Awaitable<string | null>
  setItem: (key: string, value: string) => Awaitable<void>
  removeItem: (key: string) => Awaitable<void>
}
export interface UseStorageAsyncOptions<T> extends Omit<
  UseStorageOptions<T>,
  "serializer"
> {
  /**
   * Custom data serialization — same as `useStorage`, but the serializer may be asynchronous.
   */
  serializer?: SerializerAsync<T>
  /**
   * On first value loaded hook.
   */
  onReady?: (value: T) => void
}
export type UseStorageAsyncReturn<T> = [
  value: T | null,
  setValue: Dispatch<SetStateAction<T | null>>,
]
export declare function useStorageAsync(
  key: string,
  initialValue: string,
  storage?: StorageLikeAsync,
  options?: UseStorageAsyncOptions<string>,
): UseStorageAsyncReturn<string>
export declare function useStorageAsync(
  key: string,
  initialValue: boolean,
  storage?: StorageLikeAsync,
  options?: UseStorageAsyncOptions<boolean>,
): UseStorageAsyncReturn<boolean>
export declare function useStorageAsync(
  key: string,
  initialValue: number,
  storage?: StorageLikeAsync,
  options?: UseStorageAsyncOptions<number>,
): UseStorageAsyncReturn<number>
export declare function useStorageAsync<T>(
  key: string,
  initialValue: T | (() => T),
  storage?: StorageLikeAsync,
  options?: UseStorageAsyncOptions<T>,
): UseStorageAsyncReturn<T>
export declare function useStorageAsync<T = unknown>(
  key: string,
  initialValue: null,
  storage?: StorageLikeAsync,
  options?: UseStorageAsyncOptions<T>,
): UseStorageAsyncReturn<T>
```
