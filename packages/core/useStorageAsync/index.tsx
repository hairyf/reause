import type { Dispatch, SetStateAction } from 'react'
import type { UseStorageOptions } from '../useStorage'
import { useCallback, useEffect, useRef, useState } from 'react'
import { guessSerializerType, StorageSerializers } from '../useStorage'

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

export interface UseStorageAsyncOptions<T> extends Omit<UseStorageOptions<T>, 'serializer'> {
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

function resolveWindow<T>(options: UseStorageAsyncOptions<T>): Window | undefined {
  return options.window ?? (typeof window === 'undefined' ? undefined : window)
}

function defaultOnError(error: unknown): void {
  console.error(error)
}

export function useStorageAsync(key: string, initialValue: string, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<string>): UseStorageAsyncReturn<string>
export function useStorageAsync(key: string, initialValue: boolean, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<boolean>): UseStorageAsyncReturn<boolean>
export function useStorageAsync(key: string, initialValue: number, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<number>): UseStorageAsyncReturn<number>
export function useStorageAsync<T>(key: string, initialValue: T | (() => T), storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<T>): UseStorageAsyncReturn<T>
export function useStorageAsync<T = unknown>(key: string, initialValue: null, storage?: StorageLikeAsync, options?: UseStorageAsyncOptions<T>): UseStorageAsyncReturn<T>

/**
 * Reactive Storage with async support — React port of VueUse's `useStorageAsync`.
 *
 * Map from @vueuse/core `useStorageAsync`
 * (`source/vueuse/packages/core/useStorageAsync/`). Like `useStorage`, but the
 * backend is an async `StorageLikeAsync` — every operation may return a promise — so the stored
 * value is loaded after mount: the value starts as the initial default and is replaced once the
 * async storage is ready (upstream returns a ref that doubles as a Promise; the React tuple cannot
 * be awaited, so the value simply updates itself and the `onReady` option fires).
 *
 * React divergences:
 * - the Vue `RemovableRef<T> & Promise<RemovableRef<T>>` return becomes a
 *   `useState`-backed tuple `[value, setValue]` (the setter also accepts a
 *   function updater). There is no thenable to `await`; instead the value
 *   updates when the async read settles and `onReady` fires at that point —
 *   equivalent to awaiting upstream's returned promise;
 * - `setValue(null)` removes the entry from storage and leaves the state at
 *   `null` (mirroring upstream, where the removal watch sets `data.value` to
 *   `null`; unlike the sync `useStorage` port there is no self storage-event
 *   echo that would restore `rawInit`);
 * - async writes are serialized through an internal promise queue so they
 *   commit in call order — upstream's pre-flush `watch` batches synchronous
 *   changes into one write, the queue keeps ordering deterministic in React;
 * - storage is never touched during render: the first read happens in the
 *   mount effect (SSR-safe — the server renders the initial value). When no
 *   storage is available the hook degrades to in-memory state without touching
 *   storage, reading `window.localStorage` directly instead of going through
 *   upstream's `getSSRHandler('getDefaultStorageAsync')` indirection;
 * - `key` is a plain React string; changing it between renders re-reads the
 *   new key (upstream takes a reactive `MaybeRefOrGetter` key). Writes always
 *   go to the key of the current render, and when `writeDefaults` is on, a
 *   new key with no stored value is seeded with the initial value;
 * - real `storage` events are listened to when `listenToStorageChanges` is on
 *   (mirroring upstream's `useEventListener`); like upstream there is no
 *   `storageArea` guard, so any matching-key event re-reads the storage — a
 *   custom async backend never appears as an event's `storageArea`, and the
 *   cross-tab reload relies on this. Unlike the sync `useStorage` port, no
 *   same-document synthetic events are dispatched — upstream's async variant
 *   writes through its watch without echoing;
 * - Vue reactivity options have no React equivalent and are omitted:
 *   `flush`/`deep`/`eventFilter` (writes are queued per `setValue` call) and
 *   `shallow` (React state is replaced wholesale).
 *
 * @example
 * const [accessToken, setAccessToken] = useStorageAsync('access.token', '', SomeAsyncStorage)
 * console.log(accessToken) // '' until the async storage is ready
 *
 * @see https://vueuse.org/core/useStorageAsync/
 */
export function useStorageAsync<T extends (string | number | boolean | object | null)>(
  key: string,
  initialValue: T | (() => T),
  storage?: StorageLikeAsync,
  options: UseStorageAsyncOptions<T> = {},
): UseStorageAsyncReturn<T> {
  // captured once at mount — mirrors upstream's one-time options destructuring
  const optionsRef = useRef(options)
  const storageRef = useRef(storage)

  const [state, setState] = useState<T | null>(initialValue)
  // latest committed value — lets the stable setter support function updaters
  const stateRef = useRef<T | null>(state)
  // upstream resolves `initialValue` once at setup; frozen here the same way
  const rawInitRef = useRef<{ value: T | null } | undefined>(undefined)
  rawInitRef.current ??= { value: state }
  // `onReady` fires once, after the first async read settles
  const onReadyFiredRef = useRef(false)
  // async writes must commit in call order — a promise queue mirrors the
  // ordering of upstream's (batched) watch callbacks
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve())

  const setInternal = useCallback((next: T | null) => {
    stateRef.current = next
    setState(next)
  }, [])

  const getStorage = useCallback((): StorageLikeAsync | undefined => {
    // an explicit `storage` argument wins; otherwise fall back to
    // `window.localStorage` (mirrors upstream's `getDefaultStorageAsync`)
    return storageRef.current ?? resolveWindow(optionsRef.current)?.localStorage
  }, [])

  const getSerializer = useCallback((): SerializerAsync<T> => {
    return optionsRef.current.serializer ?? StorageSerializers[guessSerializerType(rawInitRef.current!.value)]
  }, [])

  const read = useCallback(async (event?: { key: string | null, newValue: string | null }): Promise<T | null | undefined> => {
    const storage = getStorage()
    if (!storage || (event && event.key !== key))
      return undefined

    const { mergeDefaults = false, writeDefaults = true, onError = defaultOnError } = optionsRef.current
    const rawInit = rawInitRef.current!.value
    try {
      const rawValue = event
        ? event.newValue
        : await storage.getItem(key)

      if (rawValue == null) {
        if (writeDefaults && rawInit != null)
          await storage.setItem(key, await getSerializer().write(rawInit))
        return rawInit
      }
      else if (mergeDefaults) {
        const value = await getSerializer().read(rawValue)
        if (typeof mergeDefaults === 'function')
          return mergeDefaults(value, rawInit as T)
        else if (guessSerializerType(rawInit) === 'object' && !Array.isArray(value))
          return { ...(rawInit as Record<string, unknown>), ...(value as Record<string, unknown>) } as T
        return value
      }
      else {
        return await getSerializer().read(rawValue)
      }
    }
    catch (error) {
      onError(error)
      return undefined
    }
  }, [key, getStorage, getSerializer])

  const write = useCallback((value: T | null) => {
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      const storage = getStorage()
      if (!storage)
        return
      const { onError = defaultOnError } = optionsRef.current
      try {
        if (value == null) {
          await storage.removeItem(key)
        }
        else {
          // upstream always performs the write (`storage.setItem` on every
          // change) — no equality skip
          const serialized = await getSerializer().write(value)
          await storage.setItem(key, serialized)
        }
      }
      catch (error) {
        onError(error)
      }
    })
  }, [key, getStorage, getSerializer])

  const setValue = useCallback((value: SetStateAction<T | null>) => {
    const next = typeof value === 'function'
      ? (value as (prev: T | null) => T | null)(stateRef.current)
      : value
    setInternal(next)
    write(next)
  }, [setInternal, write])

  // initial read + re-read on key change (SSR-safe: effects never run on the
  // server, so the first render always shows `initialValue`). `onReady` fires
  // once the first read settles, with the loaded value — mirroring upstream's
  // `onReady` call inside the returned Promise.
  useEffect(() => {
    let disposed = false
    void (async () => {
      const storage = getStorage()
      const { onError = defaultOnError } = optionsRef.current
      try {
        if (storage) {
          const value = await read()
          if (!disposed && value !== undefined)
            setInternal(value)
        }
        if (!disposed && !onReadyFiredRef.current) {
          onReadyFiredRef.current = true
          optionsRef.current.onReady?.(stateRef.current as T)
        }
      }
      catch (error) {
        onError(error)
      }
    })()
    return () => {
      disposed = true
    }
  }, [getStorage, read, setInternal])

  useEffect(() => {
    const win = resolveWindow(optionsRef.current)
    const storage = getStorage()
    const { listenToStorageChanges = true } = optionsRef.current
    if (!win || !storage || !listenToStorageChanges)
      return

    const onStorageEvent = (event: StorageEvent): void => {
      // upstream re-reads on any matching-key storage event — there is no
      // `storageArea` guard, because a custom async backend never appears as
      // an event's `storageArea`, and the cross-tab reload for the hook's
      // target backends relies on this
      void read(event).then((value) => {
        if (value !== undefined)
          setInternal(value)
      })
    }

    win.addEventListener('storage', onStorageEvent, { passive: true })
    return () => {
      win.removeEventListener('storage', onStorageEvent)
    }
  }, [key, getStorage, read, setInternal])

  return [state, setValue] as UseStorageAsyncReturn<T>
}
