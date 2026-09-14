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
 * Map from @vueuse/core `useStorageAsync`
 * (`source/vueuse/packages/core/useStorageAsync/`).
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
