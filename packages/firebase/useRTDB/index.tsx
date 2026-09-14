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
 * Map from @vueuse/firebase `useRTDB`.
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
