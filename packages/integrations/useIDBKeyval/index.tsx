import { del, get, set, update } from 'idb-keyval'
import { useCallback, useEffect, useRef, useState } from 'react'

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
  flush?: 'pre' | 'post' | 'sync' | 'async'
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

function defaultOnError(error: unknown): void {
  console.error(error)
}

function defaultSerializer<T>(): UseIDBKeyvalSerializer<T> {
  return {
    read: (raw: unknown) => raw as T,
    write: (value: T) => value,
  }
}

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
export function useIDBKeyval<T>(
  key: IDBValidKey,
  initialValue: T,
  options: UseIDBOptions<T> = {},
): UseIDBKeyvalReturn<T> {
  // captured once at mount — mirrors upstream's one-time options destructuring
  const optionsRef = useRef(options)
  // upstream resolves `initialValue` once at setup; frozen here the same way
  const rawInitRef = useRef<{ value: T | undefined } | undefined>(undefined)
  rawInitRef.current ??= { value: initialValue }

  const [data, setDataState] = useState<T | null>(() => initialValue ?? null)
  const [isFinished, setIsFinished] = useState(false)

  // latest committed value — read by the stable `write` callback
  const dataRef = useRef<T | null>(data)
  // `undefined` until the mount effect opens the channel (upstream: `channel`)
  const channelRef = useRef<BroadcastChannel | undefined>(undefined)
  // guards every async continuation against setting state after unmount
  const mountedRef = useRef(true)

  // upstream: `window = defaultWindow`, used for the `BroadcastChannel`
  // support check (`useSupported(() => window && 'BroadcastChannel' in window)`)
  const targetWindow = optionsRef.current.window ?? (typeof window !== 'undefined' ? window : undefined)
  const isSupported = !!targetWindow && 'BroadcastChannel' in targetWindow

  // the key the current read/write callbacks belong to — a per-key token so a
  // stale read that resolves after `key` changed cannot clobber the new key's
  // data (the mounted guard alone is re-armed by the key-change effect, so it
  // cannot tell an old read apart from a current one)
  const keyRef = useRef(key)
  keyRef.current = key

  const getSerializer = useCallback((): UseIDBKeyvalSerializer<T> => {
    return optionsRef.current.serializer ?? defaultSerializer<T>()
  }, [])

  const read = useCallback(async (): Promise<void> => {
    const { onError = defaultOnError, writeDefaults = true } = optionsRef.current
    const rawInit = rawInitRef.current!.value
    const currentKey = key
    try {
      const rawValue = await get<T>(currentKey)
      if (!mountedRef.current || keyRef.current !== currentKey)
        return
      if (rawValue === undefined) {
        if (rawInit !== undefined && rawInit !== null && writeDefaults)
          await set(currentKey, getSerializer().write(rawInit))
      }
      else {
        const value = getSerializer().read(rawValue)
        dataRef.current = value
        setDataState(value)
      }
    }
    catch (error) {
      if (mountedRef.current)
        onError(error)
    }
    if (mountedRef.current)
      setIsFinished(true)
  }, [key, getSerializer])

  const write = useCallback(async (value: T | null): Promise<void> => {
    const { onError = defaultOnError } = optionsRef.current
    try {
      if (value == null) {
        await del(key)
        channelRef.current?.postMessage({ type: 'delete' })
      }
      else {
        const serializedValue = getSerializer().write(value)
        await update(key, () => serializedValue)
        channelRef.current?.postMessage({ type: 'set', value: serializedValue })
      }
    }
    catch (error) {
      onError(error)
    }
  }, [key, getSerializer])

  const setData = useCallback(async (value: T | null): Promise<void> => {
    dataRef.current = value
    if (mountedRef.current)
      setDataState(value)
    await write(value)
  }, [write])

  // initial read + re-read when `key` changes (SSR-safe: effects never run on
  // the server, so the first render always shows `initialValue`)
  useEffect(() => {
    mountedRef.current = true
    read()
    return () => {
      mountedRef.current = false
    }
  }, [read])

  // upstream: `if (listenToStorageChanges && isSupported.value)` setup block +
  // `tryOnScopeDispose(() => channel?.close())` (→ close on unmount)
  useEffect(() => {
    const { onError = defaultOnError, listenToStorageChanges = true } = optionsRef.current
    if (!listenToStorageChanges || !isSupported)
      return

    const channel = new BroadcastChannel(`vueuse-idb-${JSON.stringify(key)}`)
    channelRef.current = channel

    const onMessageEvent = (event: MessageEvent) => {
      const { type, value } = event.data ?? {}
      try {
        if (type === 'delete') {
          // upstream resets to `rawInit` and never writes back (paused watcher)
          const rawInit = rawInitRef.current!.value ?? null
          dataRef.current = rawInit
          setDataState(rawInit)
        }
        else if (type === 'set') {
          const next = getSerializer().read(value)
          dataRef.current = next
          setDataState(next)
        }
      }
      catch (error) {
        onError(error)
      }
    }

    channel.addEventListener('message', onMessageEvent, { passive: true })

    return () => {
      channel.removeEventListener('message', onMessageEvent)
      if (channelRef.current === channel)
        channelRef.current = undefined
      channel.close()
    }
  }, [key, isSupported, getSerializer])

  return [data, setData, { isFinished, isSupported }]
}
