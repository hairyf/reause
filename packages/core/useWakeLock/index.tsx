import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * The type of wake lock to request. Mirrors upstream's own `WakeLockType` (defined locally rather
 * than referenced from lib.dom, for parity with older TS libs) and is re-exported from the package
 * barrel.
 */
export type WakeLockType = 'screen'

/**
 * Mirrors upstream's own `WakeLockSentinel` interface (upstream defines it locally for older TS
 * libs instead of referencing lib.dom directly) and is re-exported from the package barrel.
 * lib.dom's `WakeLockSentinel` is assignable to this shape.
 */
export interface WakeLockSentinel extends EventTarget {
  type: WakeLockType
  released: boolean
  release: () => Promise<void>
}

/**
 * Specify a custom `navigator` or `document` instance, e.g. working with iframes or in testing
 * environments.
 *
 * Upstream composes these from the shared `ConfigurableNavigator` / `ConfigurableDocument` option
 * types; they are inlined here.
 */
export interface UseWakeLockOptions {
  /**
   * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
   *
   * @default typeof navigator !== 'undefined' ? navigator : undefined
   */
  navigator?: Navigator
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   *
   * @default typeof document !== 'undefined' ? document : undefined
   */
  document?: Document
}

export interface UseWakeLockReturn {
  /**
   * The current `WakeLockSentinel` instance, or `null` when no wake lock is held.
   */
  sentinel: WakeLockSentinel | null
  /**
   * If the Wake Lock API is supported by the current navigator.
   */
  isSupported: boolean
  /**
   * Whether a wake lock is currently held and the document is visible.
   */
  isActive: boolean
  /**
   * Request a wake lock of the given type. When the document is hidden, the request is queued and
   * replayed once the document becomes visible.
   */
  request: (type: WakeLockType) => Promise<void>
  /**
   * Request a wake lock immediately, even if the document is hidden. Note that this may throw an
   * error if the document is hidden.
   */
  forceRequest: (type: WakeLockType) => Promise<void>
  /**
   * Release the wake lock. A queued (not yet replayed) request is canceled.
   */
  release: () => Promise<void>
}

/**
 * Map from @vueuse/core `useWakeLock`
 * (`source/vueuse/packages/core/useWakeLock/`).
 *
 * @example
 * const { isSupported, isActive, request, release } = useWakeLock()
 */
export function useWakeLock(options: UseWakeLockOptions = {}): UseWakeLockReturn {
  const [sentinel, setSentinel] = useState<WakeLockSentinel | null>(null)
  // Upstream's internal `requestedType` shallowRef (`WakeLockType | false`):
  // a queued request waiting for the document to become visible.
  const [requestedType, setRequestedType] = useState<WakeLockType | false>(false)
  const [isSupported, setIsSupported] = useState(false)
  const [documentVisibility, setDocumentVisibility] = useState<DocumentVisibilityState>('visible')

  // Sync mirrors of the state above, read inside stable callbacks (upstream
  // mutates and reads its refs directly; React state is only updated
  // alongside them for rendering).
  const navigatorRef = useRef<Navigator | undefined>(undefined)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const visibilityRef = useRef<DocumentVisibilityState>('visible')

  // Resolve the configurable navigator/document once per options change and
  // reuse them in every effect below (upstream destructures
  // `{ navigator = defaultNavigator, document = defaultDocument }` once at
  // setup). Cannot use destructuring defaults directly — the TDZ would throw
  // (`const { navigator = navigator } = options`).
  const { navigator: nav, document: doc } = useMemo(
    () => ({
      navigator: options.navigator ?? (typeof navigator === 'undefined' ? undefined : navigator),
      document: options.document ?? (typeof document === 'undefined' ? undefined : document),
    }),
    [options.navigator, options.document],
  )

  // Resolve the navigator and compute support after mount (upstream:
  // `useSupported(() => navigator && 'wakeLock' in navigator)`).
  useEffect(() => {
    navigatorRef.current = nav
    setIsSupported(Boolean(nav && 'wakeLock' in nav))
  }, [nav])

  // Track `document.visibilityState` (upstream: `useDocumentVisibility`).
  useEffect(() => {
    if (!doc)
      return

    const update = () => {
      visibilityRef.current = doc.visibilityState
      setDocumentVisibility(doc.visibilityState)
    }
    update()

    doc.addEventListener('visibilitychange', update, { passive: true })
    return () => {
      doc.removeEventListener('visibilitychange', update)
    }
  }, [doc])

  const forceRequest = useCallback(async (type: WakeLockType) => {
    await sentinelRef.current?.release()
    const nav = navigatorRef.current
    const next = nav && 'wakeLock' in nav
      ? await nav.wakeLock.request(type)
      : null
    sentinelRef.current = next
    setSentinel(next)
  }, [])

  // When a sentinel is released by the system (not manually through
  // `release()`), re-queue its type so the wake lock is re-requested when
  // the document becomes visible again (upstream: `useEventListener`).
  useEffect(() => {
    if (!sentinel)
      return

    const onRelease = () => {
      setRequestedType(sentinelRef.current === sentinel ? sentinel.type : false)
    }
    sentinel.addEventListener('release', onRelease, { passive: true })
    return () => {
      sentinel.removeEventListener('release', onRelease)
    }
  }, [sentinel])

  // Upstream: `whenever(...)` — replay a queued request once the document
  // is visible again.
  useEffect(() => {
    if (!isSupported || documentVisibility !== 'visible' || !requestedType)
      return

    if (doc?.visibilityState !== 'visible')
      return

    setRequestedType(false)
    void forceRequest(requestedType)
  }, [documentVisibility, forceRequest, isSupported, doc, requestedType])

  const request = useCallback(async (type: WakeLockType) => {
    if (visibilityRef.current === 'visible')
      await forceRequest(type)
    else
      setRequestedType(type)
  }, [forceRequest])

  const release = useCallback(async () => {
    setRequestedType(false)
    const s = sentinelRef.current
    sentinelRef.current = null
    setSentinel(null)
    await s?.release()
  }, [])

  // Upstream: `tryOnScopeDispose(() => release())` — auto-release on
  // unmount.
  useEffect(() => {
    return () => {
      void release()
    }
  }, [release])

  return {
    sentinel,
    isSupported,
    isActive: !!sentinel && documentVisibility === 'visible',
    request,
    forceRequest,
    release,
  }
}
