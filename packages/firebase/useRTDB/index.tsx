import type { DatabaseReference, DataSnapshot } from 'firebase/database'
import { onValue } from 'firebase/database'
import { useEffect, useRef, useState } from 'react'

export interface UseRTDBOptions {
  /**
   * Custom error handler for database errors.
   *
   * @default (error) => console.error(error)
   */
  errorHandler?: (err: Error) => void
  /**
   * Automatically unsubscribe from the database reference when the component unmounts.
   *
   * @default true
   */
  autoDispose?: boolean
}

/**
 * Result tuple of `useRTDB`, mirroring upstream's writable Vue ref: `[data, setData]`.
 */
export type UseRTDBReturn<T> = [data: T | undefined, setData: (value: T | undefined) => void]

/**
 * Map from @vueuse/firebase `useRTDB`
 *
 * Reactive [Firebase Realtime Database](https://firebase.google.com/docs/database) binding — keeps
 * local state in sync with a database reference. The listener is registered with `onValue` in a
 * mount effect and feeds `data` with `snapshot.val()` on every database change.
 *
 * React divergences:
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
export function useRTDB<T = any>(docRef: DatabaseReference, options: UseRTDBOptions = {}): UseRTDBReturn<T> {
  const {
    errorHandler = (err: Error) => console.error(err),
    autoDispose = true,
  } = options

  const [data, setData] = useState<T | undefined>(undefined)

  // Keep the latest `errorHandler` in a ref: the subscription below reads it
  // when a database error arrives, so an inline handler passed on every render
  // never re-subscribes.
  const errorHandlerRef = useRef(errorHandler)
  useEffect(() => {
    errorHandlerRef.current = errorHandler
  }, [errorHandler])

  // Register the listener on mount; re-register when the reference identity or
  // `autoDispose` changes. Cleanup only unsubscribes when `autoDispose` is
  // `true` — upstream parity (`tryOnScopeDispose(() => off())`).
  useEffect(() => {
    const off = onValue(
      docRef,
      (snapshot: DataSnapshot) => setData(snapshot.val() as T),
      (err: Error) => errorHandlerRef.current(err),
    )

    return () => {
      if (autoDispose)
        off()
    }
  }, [docRef, autoDispose])

  return [data, setData]
}
