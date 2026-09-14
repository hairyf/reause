import type { DocumentData, DocumentReference, DocumentSnapshot, Query, QueryDocumentSnapshot, Unsubscribe } from 'firebase/firestore'
import { isDef } from '@reause/shared'
import { useEffect, useRef, useState } from 'react'

export interface UseFirestoreOptions {
  /**
   * Custom error handler for Firestore subscription errors.
   *
   * @default (error) => console.error(error)
   */
  errorHandler?: (err: Error) => void

  /**
   * Automatically unsubscribe when the component unmounts. Pass a number to delay the unsubscribe
   * by that many milliseconds (upstream's `useTimeoutFn`-based delayed dispose).
   *
   * @default true
   */
  autoDispose?: boolean | number
}

export type FirebaseDocRef<T>
  = Query<T>
    | DocumentReference<T>

/**
 * Attach the document `id` as a non-writable property of the snapshot data — ported verbatim from
 * upstream. `data()` may be `undefined` for a deleted document.
 */
function getData<T>(docRef: DocumentSnapshot<T> | QueryDocumentSnapshot<T>) {
  const data = docRef.data()

  if (data) {
    Object.defineProperty(data, 'id', {
      value: docRef.id.toString(),
      writable: false,
    })
  }

  return data
}

/**
 * Slash-parity check, ported verbatim from upstream: a `DocumentReference` path has an odd number
 * of segments (`users/ada`), a `Query` path an even number (`users` or `users/ada/posts`).
 */
function isDocumentReference<T>(docRef: any): docRef is DocumentReference<T> {
  return (docRef.path?.match(/\//g) || []).length % 2 !== 0
}

type Falsy = false | 0 | '' | null | undefined

export function useFirestore<T extends DocumentData>(
  maybeDocRef: DocumentReference<T> | Falsy,
  initialValue: T,
  options?: UseFirestoreOptions,
): T | null
export function useFirestore<T extends DocumentData>(
  maybeDocRef: Query<T> | Falsy,
  initialValue: T[],
  options?: UseFirestoreOptions,
): T[]

// nullable initial values
export function useFirestore<T extends DocumentData>(
  maybeDocRef: DocumentReference<T> | Falsy,
  initialValue?: T | undefined | null,
  options?: UseFirestoreOptions,
): T | undefined | null
export function useFirestore<T extends DocumentData>(
  maybeDocRef: Query<T> | Falsy,
  initialValue?: T[],
  options?: UseFirestoreOptions,
): T[] | undefined

/**
 * React port of VueUse's `useFirestore`.
 *
 * Map from @vueuse/firebase/useFirestore
 * (`source/vueuse/packages/firebase/useFirestore/`). Reactive
 * [Firestore](https://firebase.google.com/docs/firestore) binding — it keeps local state in sync
 * with a document reference or a query, so a component always renders the freshest remote data.
 *
 * React divergences:
 * - `maybeDocRef` is a plain value (upstream accepts `MaybeRef`): read-only
 *   value-source parameters take plain `T`. Pass a new reference/query
 *   identity to re-subscribe — **keep it stable across renders** (memoize
 *   `doc`/`collection`/`query` results): a fresh identity on every render
 *   re-subscribes on every render;
 * - the return is the plain state VALUE (not a tuple, not an object) —
 *   upstream exposes no setter (0 writable values), so the shape mirrors the
 *   read side of upstream's `Ref<T | null>` / `Ref<T[]>`; a document resolves
 *   to `T | null` (a deleted document becomes `null`), a query to `T[]`;
 * - the subscription lives in an effect keyed on `maybeDocRef`, so a new
 *   ref/query identity re-subscribes and closes the previous `onSnapshot`
 *   (upstream's immediate watch); a falsy docRef resets `data` to
 *   `initialValue`;
 * - `firebase/firestore` is loaded through a guarded **dynamic** import, so
 *   this module never throws at import time when `firebase` is missing — a
 *   missing module or a failed `onSnapshot` call surfaces through
 *   `errorHandler` instead, and `data` stays at `initialValue`;
 * - the latest `errorHandler` is read from a ref, so passing an inline handler
 *   does not re-subscribe;
 * - nothing runs while rendering, so server rendering is safe.
 *
 * @see https://vueuse.org/firebase/useFirestore/
 *
 * @example
 * const todos = useFirestore(collection(db, 'todos'))
 * const user = useFirestore(doc(db, 'users', 'my-user-id'))
 *
 * @__NO_SIDE_EFFECTS__
 */
export function useFirestore<T extends DocumentData>(
  maybeDocRef: FirebaseDocRef<T> | Falsy,
  initialValue: T | T[] | null | undefined = undefined,
  options: UseFirestoreOptions = {},
): T | T[] | null | undefined {
  const {
    errorHandler = (err: Error) => console.error(err),
    autoDispose = true,
  } = options

  const [data, setData] = useState<T | T[] | null | undefined>(initialValue)

  // upstream captures `initialValue` and `options` once in setup, so a later
  // re-render with new values must not change what a falsy docRef resets to or
  // how the subscription is disposed
  const initialValueRef = useRef(initialValue)
  const autoDisposeRef = useRef(autoDispose)

  // Keep the latest `errorHandler` in a ref: the subscription reads it when an
  // error arrives, so an inline handler passed on every render never
  // re-subscribes.
  const errorHandlerRef = useRef(errorHandler)
  useEffect(() => {
    errorHandlerRef.current = errorHandler
  }, [errorHandler])

  // the current `onSnapshot` unsubscribe, shared between the subscription
  // effect (re-subscribe) and the dispose effect (unmount)
  const closeRef = useRef<() => void>(() => {})

  // Subscribe on mount and re-subscribe when `maybeDocRef` changes — upstream's
  // immediate watch. Every run closes the previous listener first; a falsy
  // docRef resets `data` to `initialValue`.
  useEffect(() => {
    // upstream calls `close()` at the top of every watch callback run
    closeRef.current()
    closeRef.current = () => {}

    if (!maybeDocRef) {
      setData(initialValueRef.current)
      return
    }

    let active = true
    let close: Unsubscribe | undefined

    // guarded runtime import: `firebase/firestore` stays optional, so this
    // module evaluates fine without it; a missing module (or a failed
    // `onSnapshot` call) surfaces through `errorHandler` instead of throwing
    // at import time
    void import('firebase/firestore').then(({ onSnapshot }) => {
      if (!active)
        return
      try {
        if (isDocumentReference<T>(maybeDocRef)) {
          close = onSnapshot(
            maybeDocRef as DocumentReference<T>,
            (snapshot) => {
              if (!active)
                return
              setData(getData(snapshot) || null)
            },
            (err: Error) => errorHandlerRef.current(err),
          )
        }
        else {
          close = onSnapshot(
            maybeDocRef as Query<T>,
            (snapshot) => {
              if (!active)
                return
              setData(snapshot.docs.map(getData).filter(isDef))
            },
            (err: Error) => errorHandlerRef.current(err),
          )
        }
        closeRef.current = close ?? (() => {})
      }
      catch (err) {
        errorHandlerRef.current(err instanceof Error ? err : new Error(String(err)))
      }
    }).catch((err: unknown) => {
      if (!active)
        return
      errorHandlerRef.current(err instanceof Error ? err : new Error(String(err)))
    })

    return () => {
      // a callback delivered after re-subscribe/unmount belongs to a
      // superseded listener and must not write stale state
      active = false
    }
  }, [maybeDocRef])

  // Dispose on unmount — upstream's `tryOnScopeDispose` branch.
  useEffect(() => {
    return () => {
      if (autoDisposeRef.current === true) {
        closeRef.current()
      }
      else if (typeof autoDisposeRef.current === 'number') {
        // delayed dispose: unsubscribe `autoDispose` ms after unmount
        setTimeout(() => {
          closeRef.current()
        }, autoDisposeRef.current)
      }
      // `autoDispose: false` → the subscription outlives the component
      // (upstream parity — a deliberate leak)
    }
  }, [])

  return data
}
