---
category: State
---

# useStorage

Create a controllable state that can be used to access & modify [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) or [SessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).

Uses localStorage by default, other storage sources be specified via third argument.

## Usage

```tsx
import { useStorage } from '@reause/core'

const [state, setState] = useStorage('my-store', { hello: 'hi', greeting: 'Hello' })
const [flag, setFlag] = useStorage('my-flag', true)
const [id, setId] = useStorage('my-id', 'some-string-id', sessionStorage)

setState(null) // delete data from storage
```

## Merge Defaults

By default, `useStorage` will use the value from storage if it is present and ignores the default value. Be aware that when you are adding more properties to the default value, the key might be `undefined` if client's storage does not have that key.

```tsx
import { useStorage } from '@reause/core'
// ---cut---
localStorage.setItem('my-store', '{"hello": "hello"}')

const [state, setState] = useStorage('my-store', { hello: 'hi', greeting: 'hello' }, localStorage)

console.log(state.greeting) // undefined, since the value is not presented in storage
```

To solve that, you can enable `mergeDefaults` option.

```tsx
import { useStorage } from '@reause/core'
// ---cut---
localStorage.setItem('my-store', '{"hello": "nihao"}')

const [state, setState] = useStorage(
  'my-store',
  { hello: 'hi', greeting: 'hello' },
  localStorage,
  { mergeDefaults: true }, // <--
)

console.log(state.hello) // 'nihao', from storage
console.log(state.greeting) // 'hello', from merged default value
```

When setting it to true, it will perform a **shallow merge** for objects. You can pass a function to perform custom merge (e.g. deep merge), for example:

```tsx
import { useStorage } from '@reause/core'
// ---cut---
const [state, setState] = useStorage(
  'my-store',
  { hello: 'hi', greeting: 'hello' },
  localStorage,
  { mergeDefaults: (storageValue, defaults) => deepMerge(defaults, storageValue) }, // <--
)
```

## Custom Serialization

By default, `useStorage` will smartly use the corresponding serializer based on the data type of provided default value. For example, `JSON.stringify` / `JSON.parse` will be used for objects, `Number.toString` / `parseFloat` for numbers, etc.

You can also provide your own serialization function to `useStorage`:

```tsx
import { useStorage } from '@reause/core'

useStorage(
  'key',
  {},
  undefined,
  {
    serializer: {
      read: (v: any) => v ? JSON.parse(v) : null,
      write: (v: any) => JSON.stringify(v),
    },
  },
)
```

Please note when you provide `null` as the default value, `useStorage` can't assume the data type from it. In this case, you can provide a custom serializer or reuse the built-in ones explicitly.

```tsx
import { StorageSerializers, useStorage } from '@reause/core'

const [objectLike, setObjectLike] = useStorage('key', null, undefined, { serializer: StorageSerializers.object })
setObjectLike({ foo: 'bar' })
```

### Built-in Serializers

The following serializers are available via `StorageSerializers`:

| Type      | Description                           |
| --------- | ------------------------------------- |
| `string`  | Plain string                          |
| `number`  | Number (via `parseFloat`)             |
| `boolean` | Boolean                               |
| `object`  | JSON object/array                     |
| `map`     | JavaScript `Map`                      |
| `set`     | JavaScript `Set`                      |
| `date`    | JavaScript `Date` (via `toISOString`) |
| `any`     | Raw string passthrough                |

```tsx
import { StorageSerializers, useStorage } from '@reause/core'

const [myMap, setMyMap] = useStorage('my-map', new Map(), undefined, {
  serializer: StorageSerializers.map,
})
```

## Options

```tsx
useStorage('key', defaults, storage, {
  // Sync across tabs via storage events (default: true)
  listenToStorageChanges: true,
  // Write default value to storage if not present (default: true)
  writeDefaults: true,
  // Custom error handler (default: console.error)
  onError: e => console.error(e),
})
```

## Reactive Key

The storage key can be derived from state — the data will be updated when the key changes between renders:

```tsx
import { useStorage } from '@reause/core'
import { useState } from 'react'

const [userId, setUserId] = useState('user-1')
const userData = useStorage(
  `user-data-${userId}`,
  { name: '' },
)

// Changing the key will read from the new storage location
setUserId('user-2')
```

## Type Declarations

```ts
/**
 * Custom data serialization.
 */
interface Serializer<T> {
  read: (raw: string) => T
  write: (value: T) => string
}
/**
 * Minimal storage backend contract — `Storage` satisfies it structurally, so `window.localStorage`
 * / `window.sessionStorage` and custom Map-backed implementations all work.
 */
export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}
/**
 * Event payload shared by real `storage` events and the custom same-document sync event dispatched
 * for `StorageLike` backends.
 */
export interface StorageEventLike {
  storageArea: StorageLike | null
  key: StorageEvent["key"]
  oldValue: StorageEvent["oldValue"]
  newValue: StorageEvent["newValue"]
}
/**
 * Event name used for same-document sync when the backend is a custom `StorageLike` (a real
 * `StorageEvent` cannot be constructed with a non-built-in storage area, mirroring upstream).
 */
export declare const customStorageEventName = "reause-storage"
/**
 * Serializer registry selected automatically from the type of the default value: strings stay raw,
 * `boolean`/`number` via `String()`, objects via JSON, `Map`/`Set` via JSON entries, `Date` via ISO
 * string.
 */
export declare const StorageSerializers: Record<
  "boolean" | "object" | "number" | "any" | "string" | "map" | "set" | "date",
  Serializer<any>
>
/**
 * Options captured from upstream's `UseStorageOptions` — only the parts that translate to a React
 * hook. Vue reactivity options (`flush`, `deep`, `eventFilter`, `shallow`, `initOnMounted`) have no
 * equivalent and are omitted; see the hook's divergence notes. Upstream extends
 * `ConfigurableWindow`, but the interface stays expanded here so the option can be declared inline.
 */
export interface UseStorageOptions<T> {
  /**
   * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
   */
  window?: Window
  /**
   * Listen to storage changes — useful for multiple tabs applications and for hook instances
   * sharing the same key within the same document.
   *
   * @default true
   */
  listenToStorageChanges?: boolean
  /**
   * Write the default value to the storage when it does not exist.
   *
   * @default true
   */
  writeDefaults?: boolean
  /**
   * Merge the default value with the value read from the storage.
   *
   * When setting it to `true`, it will perform a **shallow merge** for objects. You can pass a
   * function to perform a custom merge, for example:
   *
   * @default false
   */
  mergeDefaults?: boolean | ((storageValue: T, defaults: T) => T)
  /**
   * Custom data serialization. Defaults are selected per type from `StorageSerializers`.
   */
  serializer?: Serializer<T>
  /**
   * On error callback.
   *
   * @default (error) => console.error(error)
   */
  onError?: (error: unknown) => void
}
export type UseStorageReturn<T> = [
  value: T | null,
  setValue: Dispatch<SetStateAction<T | null>>,
]
export type SerializerType =
  "boolean" | "object" | "number" | "any" | "string" | "map" | "set" | "date"
export declare function guessSerializerType<
  T extends string | number | boolean | object | null,
>(rawInit: T): SerializerType
export declare function useStorage(
  key: string,
  defaults: string,
  storage?: StorageLike,
  options?: UseStorageOptions<string>,
): UseStorageReturn<string>
export declare function useStorage(
  key: string,
  defaults: boolean,
  storage?: StorageLike,
  options?: UseStorageOptions<boolean>,
): UseStorageReturn<boolean>
export declare function useStorage(
  key: string,
  defaults: number,
  storage?: StorageLike,
  options?: UseStorageOptions<number>,
): UseStorageReturn<number>
export declare function useStorage<T>(
  key: string,
  defaults: T | (() => T),
  storage?: StorageLike,
  options?: UseStorageOptions<T>,
): UseStorageReturn<T>
export declare function useStorage<T = unknown>(
  key: string,
  defaults: null,
  storage?: StorageLike,
  options?: UseStorageOptions<T>,
): UseStorageReturn<T>
```
