import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

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
  key: StorageEvent['key']
  oldValue: StorageEvent['oldValue']
  newValue: StorageEvent['newValue']
}

/**
 * Event name used for same-document sync when the backend is a custom `StorageLike` (a real
 * `StorageEvent` cannot be constructed with a non-built-in storage area, mirroring upstream).
 */
export const customStorageEventName = 'reause-storage'

/**
 * Serializer registry selected automatically from the type of the default value: strings stay raw,
 * `boolean`/`number` via `String()`, objects via JSON, `Map`/`Set` via JSON entries, `Date` via ISO
 * string.
 */
export const StorageSerializers: Record<'boolean' | 'object' | 'number' | 'any' | 'string' | 'map' | 'set' | 'date', Serializer<any>> = {
  boolean: {
    read: (v: any) => v === 'true',
    write: (v: any) => String(v),
  },
  object: {
    read: (v: any) => JSON.parse(v),
    write: (v: any) => JSON.stringify(v),
  },
  number: {
    read: (v: any) => Number.parseFloat(v),
    write: (v: any) => String(v),
  },
  any: {
    read: (v: any) => v,
    write: (v: any) => String(v),
  },
  string: {
    read: (v: any) => v,
    write: (v: any) => String(v),
  },
  map: {
    read: (v: any) => new Map(JSON.parse(v)),
    write: (v: any) => JSON.stringify(Array.from((v as Map<any, any>).entries())),
  },
  set: {
    read: (v: any) => new Set(JSON.parse(v)),
    write: (v: any) => JSON.stringify(Array.from(v as Set<any>)),
  },
  date: {
    read: (v: any) => new Date(v),
    write: (v: any) => v.toISOString(),
  },
}

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

export type SerializerType = 'boolean' | 'object' | 'number' | 'any' | 'string' | 'map' | 'set' | 'date'

export function guessSerializerType<T extends (string | number | boolean | object | null)>(rawInit: T): SerializerType {
  return rawInit == null
    ? 'any'
    : rawInit instanceof Set
      ? 'set'
      : rawInit instanceof Map
        ? 'map'
        : rawInit instanceof Date
          ? 'date'
          : typeof rawInit === 'boolean'
            ? 'boolean'
            : typeof rawInit === 'string'
              ? 'string'
              : typeof rawInit === 'object'
                ? 'object'
                : !Number.isNaN(rawInit)
                    ? 'number'
                    : 'any'
}

function resolveWindow<T>(options: UseStorageOptions<T>): Window | undefined {
  return options.window ?? (typeof window === 'undefined' ? undefined : window)
}

function defaultOnError(error: unknown): void {
  console.error(error)
}

export function useStorage(key: string, defaults: string, storage?: StorageLike, options?: UseStorageOptions<string>): UseStorageReturn<string>
export function useStorage(key: string, defaults: boolean, storage?: StorageLike, options?: UseStorageOptions<boolean>): UseStorageReturn<boolean>
export function useStorage(key: string, defaults: number, storage?: StorageLike, options?: UseStorageOptions<number>): UseStorageReturn<number>
export function useStorage<T>(key: string, defaults: T | (() => T), storage?: StorageLike, options?: UseStorageOptions<T>): UseStorageReturn<T>
export function useStorage<T = unknown>(key: string, defaults: null, storage?: StorageLike, options?: UseStorageOptions<T>): UseStorageReturn<T>

/**
 * Reactive LocalStorage/SessionStorage — React port of VueUse's `useStorage`.
 *
 * Map from @vueuse/core `useStorage`
 * (`source/vueuse/packages/core/useStorage/`). Create a state tuple synced to
 * [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) (or a custom
 * `StorageLike` backend): the value is persisted under `key`, re-read on mount and key change, and
 * kept in sync across tabs and across hook instances sharing the same key.
 *
 * React divergences:
 * - the Vue `RemovableRef<T>` return becomes a `useState`-backed tuple;
 *   `setValue` also accepts a function updater. `setValue(null)` removes the
 *   entry from storage and the state falls back to the initial value,
 *   mirroring upstream where the self storage-event echo restores the raw
 *   defaults;
 * - `key` and `defaults` are plain values (upstream takes `MaybeRefOrGetter`);
 *   changing `key` between renders re-reads the new key, and writes always go
 *   to the key of the current render. A function `defaults` is a lazy
 *   initializer (React `useState` convention, like upstream's getter form)
 *   and is resolved once at mount;
 * - storage is never touched during render: the first read happens in the
 *   mount effect (SSR-safe — the server renders the initial value). When no
 *   storage is available the hook degrades to in-memory state without
 *   touching storage, mirroring upstream's early return; the fallback reads
 *   `window.localStorage` directly instead of going through upstream's
 *   `getSSRHandler('getDefaultStorage')` indirection;
 * - real `storage` events only fire across documents, so same-document sync
 *   re-dispatches a synthetic event on `window` — a real `StorageEvent` for
 *   `Storage` backends, `customStorageEventName` for custom `StorageLike`
 *   ones (mirroring upstream);
 * - Vue reactivity options have no React equivalent and are omitted:
 *   `flush`/`deep`/`eventFilter` (writes happen synchronously inside
 *   `setValue`), `shallow` (React state is replaced wholesale) and
 *   `initOnMounted` (effectively always on — the first read happens in the
 *   mount effect).
 *
 * @example
 * const [state, setState] = useStorage('my-store', { hello: 'hi', greeting: 'Hello' })
 * const [flag, setFlag] = useStorage('my-flag', true)
 *
 * setState(null) // delete data from storage
 *
 * @see https://vueuse.org/core/useStorage/
 */
export function useStorage<T extends (string | number | boolean | object | null)>(
  key: string,
  defaults: T | (() => T),
  storage?: StorageLike,
  options: UseStorageOptions<T> = {},
): UseStorageReturn<T> {
  // captured once at mount — mirrors upstream's one-time options destructuring
  const optionsRef = useRef(options)
  const storageRef = useRef(storage)

  const [state, setState] = useState<T | null>(defaults)
  // latest committed value — lets the stable setter support function updaters
  // and lets storage-event handling suppress self-echoes (mirrors upstream's
  // pausable watch + `serializer.write(data.value)` comparison)
  const stateRef = useRef<T | null>(state)
  // upstream resolves `defaults` once at setup; frozen here the same way
  const rawInitRef = useRef<{ value: T | null } | undefined>(undefined)
  rawInitRef.current ??= { value: state }

  const setInternal = useCallback((next: T | null) => {
    stateRef.current = next
    setState(next)
  }, [])

  const getStorage = useCallback((): StorageLike | undefined => {
    // an explicit `storage` argument wins; otherwise fall back to
    // `window.localStorage` (mirrors upstream's `getDefaultStorage`)
    return storageRef.current ?? resolveWindow(optionsRef.current)?.localStorage
  }, [])

  const getSerializer = useCallback((): Serializer<T> => {
    return optionsRef.current.serializer ?? StorageSerializers[guessSerializerType(rawInitRef.current!.value)]
  }, [])

  const dispatchWriteEvent = useCallback((oldValue: string | null, newValue: string | null) => {
    const win = resolveWindow(optionsRef.current)
    const storage = getStorage()
    if (!win || !storage)
      return
    const payload = {
      key,
      oldValue,
      newValue,
      // cast for the StorageEvent constructor — this branch is only reached
      // for real `Storage` instances
      storageArea: storage as Storage,
    }
    win.dispatchEvent(storage instanceof Storage
      ? new StorageEvent('storage', payload)
      : new CustomEvent<StorageEventLike>(customStorageEventName, { detail: payload }))
  }, [key, getStorage])

  const write = useCallback((value: T | null) => {
    const { onError = defaultOnError } = optionsRef.current
    try {
      // `getStorage()` resolves `window.localStorage`, whose getter can throw
      // (e.g. privacy modes) — upstream wraps the setup resolution in the
      // same try so a throwing storage escapes through `onError`
      const storage = getStorage()
      if (!storage)
        return
      const oldValue = storage.getItem(key)

      if (value == null) {
        dispatchWriteEvent(oldValue, null)
        storage.removeItem(key)
      }
      else {
        const serialized = getSerializer().write(value)
        if (oldValue !== serialized) {
          storage.setItem(key, serialized)
          dispatchWriteEvent(oldValue, serialized)
        }
      }
    }
    catch (error) {
      onError(error)
    }
  }, [key, getStorage, getSerializer, dispatchWriteEvent])

  const read = useCallback((event?: StorageEventLike): T | null => {
    const storage = getStorage()!
    const rawInit = rawInitRef.current!.value
    const { mergeDefaults = false, writeDefaults = true } = optionsRef.current
    const rawValue = event
      ? event.newValue
      : storage.getItem(key)

    if (rawValue == null) {
      if (writeDefaults && rawInit != null)
        storage.setItem(key, getSerializer().write(rawInit))
      return rawInit
    }
    else if (!event && mergeDefaults) {
      const value = getSerializer().read(rawValue)
      if (typeof mergeDefaults === 'function')
        return mergeDefaults(value, rawInit as T)
      else if (guessSerializerType(rawInit) === 'object' && !Array.isArray(value))
        return { ...(rawInit as Record<string, unknown>), ...(value as Record<string, unknown>) } as T
      return value
    }
    else {
      return getSerializer().read(rawValue)
    }
  }, [key, getStorage, getSerializer])

  const setValue = useCallback((value: SetStateAction<T | null>) => {
    const next = typeof value === 'function'
      ? (value as (prev: T | null) => T | null)(stateRef.current)
      : value
    setInternal(next)
    write(next)
  }, [setInternal, write])

  // initial read + re-read on key change (SSR-safe: effects never run on the
  // server, so the first render always shows `initialValue`)
  useEffect(() => {
    const { onError = defaultOnError } = optionsRef.current
    try {
      const storage = getStorage()
      if (!storage)
        return
      setInternal(read())
    }
    catch (error) {
      onError(error)
    }
  }, [getStorage, read, setInternal])

  useEffect(() => {
    const win = resolveWindow(optionsRef.current)
    const storage = getStorage()
    const { listenToStorageChanges = true } = optionsRef.current
    if (!win || !storage || !listenToStorageChanges)
      return

    const updateFromEvent = (event: StorageEventLike): void => {
      if (event.storageArea !== storage)
        return

      if (event.key == null) {
        // storage cleared — reset to the initial value (mirrors upstream)
        setInternal(rawInitRef.current!.value)
        return
      }

      if (event.key !== key)
        return

      const { onError = defaultOnError } = optionsRef.current
      try {
        const serializedData = getSerializer().write(stateRef.current as T)
        if (event.newValue !== serializedData)
          setInternal(read(event))
      }
      catch (error) {
        onError(error)
      }
    }

    const onStorageEvent = (event: StorageEvent): void => updateFromEvent(event)
    const onCustomStorageEvent = (event: Event): void => updateFromEvent((event as CustomEvent<StorageEventLike>).detail)

    // a real `Storage` listens for `storage` events (cross-tab + our
    // synthetic same-document re-dispatch); custom `StorageLike` backends
    // only ever see the custom event (mirrors upstream)
    if (storage instanceof Storage)
      win.addEventListener('storage', onStorageEvent, { passive: true })
    else
      win.addEventListener(customStorageEventName, onCustomStorageEvent)

    return () => {
      if (storage instanceof Storage)
        win.removeEventListener('storage', onStorageEvent)
      else
        win.removeEventListener(customStorageEventName, onCustomStorageEvent)
    }
  }, [key, getStorage, getSerializer, read, setInternal])

  return [state, setValue] as UseStorageReturn<T>
}
