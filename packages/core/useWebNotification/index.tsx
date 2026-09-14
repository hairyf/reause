import type { ConfigurableWindow } from '@reause/shared'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Notification display options, mirrored from upstream `WebNotificationOptions` — every field maps
 * 1:1 to the corresponding
 * [Notification](https://developer.mozilla.org/en-US/docs/Web/API/Notification/Notification)
 * constructor option.
 */
export interface WebNotificationOptions {
  /**
   * The title of the notification.
   *
   * @default ''
   */
  title?: string
  /**
   * The body string of the notification.
   *
   * @default ''
   */
  body?: string
  /**
   * The text direction of the notification.
   *
   * @default ''
   */
  dir?: 'auto' | 'ltr' | 'rtl'
  /**
   * The language code of the notification.
   *
   * @default DOMString
   */
  lang?: string
  /**
   * The ID of the notification (if any).
   *
   * @default ''
   */
  tag?: string
  /**
   * The URL of the image used as an icon of the notification.
   *
   * @default ''
   */
  icon?: string
  /**
   * Specifies whether the user should be notified after a new notification replaces an old one.
   *
   * @default false
   */
  renotify?: boolean
  /**
   * A boolean value indicating that a notification should remain active until the user clicks or
   * dismisses it, rather than closing automatically.
   *
   * @default false
   */
  requireInteraction?: boolean
  /**
   * Specifies whether the notification should be silent, i.e., no sounds or vibrations should be
   * issued, regardless of the device settings.
   *
   * @default false
   */
  silent?: boolean
  /**
   * Specifies a vibration pattern for devices with vibration hardware to emit, as specified in the
   * Vibration API spec.
   *
   * @see https://w3c.github.io/vibration/
   */
  vibrate?: number[]
}

/**
 * Options for `useWebNotification` — upstream `UseWebNotificationOptions` (`WebNotificationOptions`
 * + `ConfigurableWindow` + the permission flag).
 */
export interface UseWebNotificationOptions extends ConfigurableWindow, WebNotificationOptions {
  /**
   * Request for permissions on mount if it's not granted.
   *
   * Can be disabled and calling `ensurePermissions` to grant afterwards.
   *
   * @default true
   */
  requestPermissions?: boolean
}

/**
 * Map from @vueuse/core `useWebNotification`
 * (`source/vueuse/packages/core/useWebNotification/`).
 *
 * @example
 * const {
 *   isSupported,
 *   notification,
 *   permissionGranted,
 *   show,
 *   close,
 *   onClick,
 *   onShow,
 *   onError,
 *   onClose,
 * } = useWebNotification({ title: 'Hello, reause world!', tag: 'test' })
 *
 * onClick((event) => {
 *   // Do something with the notification on:click event...
 * })
 */
export function useWebNotification(
  options: UseWebNotificationOptions = {},
): UseWebNotificationReturn {
  // Latest-options mirror: `show()` stays identity-stable while always using
  // the current render's options (upstream closes over the setup-time ones).
  const optionsRef = useRef(options)
  optionsRef.current = options

  const [isSupported, setIsSupported] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [notification, setNotificationState] = useState<Notification | null>(null)

  // Latest-value mirrors so the stable callbacks read current state without
  // being recreated per render (and so the async `ensurePermissions` returns
  // the freshly-updated value, mirroring the upstream ref write).
  const isSupportedRef = useRef(false)
  const permissionGrantedRef = useRef(false)
  const notificationRef = useRef<Notification | null>(null)

  const setPermissionGrantedState = useCallback((granted: boolean) => {
    permissionGrantedRef.current = granted
    setPermissionGranted(granted)
  }, [])

  const setNotification = useCallback((instance: Notification | null) => {
    notificationRef.current = instance
    setNotificationState(instance)
  }, [])

  // Event hooks: upstream `createEventHook<Event>()` — one stable subscribe
  // function per event, returning an `off` handle to unsubscribe.
  const clickFns = useRef(new Set<(event: Event) => void>())
  const showFns = useRef(new Set<(event: Event) => void>())
  const errorFns = useRef(new Set<(event: Event) => void>())
  const closeFns = useRef(new Set<(event: Event) => void>())

  const onClick = useCallback((fn: (event: Event) => void) => {
    clickFns.current.add(fn)
    return {
      off: () => {
        clickFns.current.delete(fn)
      },
    }
  }, [])

  const onShow = useCallback((fn: (event: Event) => void) => {
    showFns.current.add(fn)
    return {
      off: () => {
        showFns.current.delete(fn)
      },
    }
  }, [])

  const onError = useCallback((fn: (event: Event) => void) => {
    errorFns.current.add(fn)
    return {
      off: () => {
        errorFns.current.delete(fn)
      },
    }
  }, [])

  const onClose = useCallback((fn: (event: Event) => void) => {
    closeFns.current.add(fn)
    return {
      off: () => {
        closeFns.current.delete(fn)
      },
    }
  }, [])

  const clickTrigger = useCallback((event: Event) => {
    Array.from(clickFns.current).forEach(fn => fn(event))
  }, [])

  const showTrigger = useCallback((event: Event) => {
    Array.from(showFns.current).forEach(fn => fn(event))
  }, [])

  const errorTrigger = useCallback((event: Event) => {
    Array.from(errorFns.current).forEach(fn => fn(event))
  }, [])

  const closeTrigger = useCallback((event: Event) => {
    Array.from(closeFns.current).forEach(fn => fn(event))
  }, [])

  // Request permissions on mount if not granted yet (upstream: the
  // `permissionGranted` setup init + `tryOnMounted(ensurePermissions)`).
  const ensurePermissions = useCallback(async (): Promise<boolean | undefined> => {
    if (!isSupportedRef.current)
      return undefined

    if (!permissionGrantedRef.current && Notification.permission !== 'denied') {
      const result = await Notification.requestPermission()
      if (result === 'granted')
        setPermissionGrantedState(true)
    }

    return permissionGrantedRef.current
  }, [setPermissionGrantedState])

  // Show notification method:
  const show = useCallback(async (overrides?: WebNotificationOptions): Promise<Notification | undefined> => {
    // If either the browser does not support notifications or the user has
    // not granted permission, do nothing:
    if (!isSupportedRef.current || !permissionGrantedRef.current)
      return undefined

    const merged = Object.assign({}, optionsRef.current, overrides)

    const instance = new Notification(merged.title || '', merged)
    setNotification(instance)

    instance.onclick = clickTrigger
    instance.onshow = showTrigger
    instance.onerror = errorTrigger
    instance.onclose = closeTrigger

    return instance
  }, [clickTrigger, closeTrigger, errorTrigger, setNotification, showTrigger])

  // Close notification method:
  const close = useCallback((): void => {
    if (notificationRef.current)
      notificationRef.current.close()
    setNotification(null)
  }, [setNotification])

  // Capability detection (upstream: the `useSupported` setup callback,
  // including the constructability probe for the Android Chrome
  // illegal-constructor quirk) + initial `permissionGranted` read +
  // `tryOnMounted(ensurePermissions)` — all moved into the mount effect so
  // nothing touches `Notification` during render (SSR-safe).
  useEffect(() => {
    const win = optionsRef.current.window ?? (typeof window === 'undefined' ? undefined : window)

    let supported = false
    if (win && 'Notification' in win) {
      if (Notification.permission === 'granted') {
        supported = true
      }
      else {
        // https://stackoverflow.com/questions/29774836/failed-to-construct-notification-illegal-constructor/29895431
        // https://issues.chromium.org/issues/40415865
        try {
          const probe = new Notification('')
          probe.onshow = () => {
            probe.close()
          }
          supported = true
        }
        catch (e) {
          // Android Chrome: Uncaught TypeError: Failed to construct 'Notification': Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead.
          supported = (e as TypeError).name !== 'TypeError'
        }
      }
    }

    isSupportedRef.current = supported
    setIsSupported(supported)

    if (supported && 'permission' in Notification && Notification.permission === 'granted')
      setPermissionGrantedState(true)

    if (optionsRef.current.requestPermissions !== false)
      void ensurePermissions()
  }, [ensurePermissions, setPermissionGrantedState])

  // Attempt cleanup of the notification (upstream: `tryOnScopeDispose(close)`)
  // and of the event subscriptions (upstream: `tryOnScopeDispose` inside
  // createEventHook's `on`).
  useEffect(() => {
    return () => {
      close()
      clickFns.current.clear()
      showFns.current.clear()
      errorFns.current.clear()
      closeFns.current.clear()
    }
  }, [close])

  // Use close() to remove a notification that is no longer relevant to the
  // user (e.g. the user already read the notification on the webpage).
  // Most modern browsers dismiss notifications automatically after a few
  // moments (around four seconds).
  const { window: customWindow } = options
  useEffect(() => {
    const win = customWindow ?? (typeof window === 'undefined' ? undefined : window)
    if (!isSupported || !win)
      return

    const doc = win.document
    const onVisibilityChange = (e: Event) => {
      e.preventDefault()
      if (doc.visibilityState === 'visible') {
        // The tab has become visible so clear the now-stale Notification:
        close()
      }
    }

    doc.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      doc.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [close, customWindow, isSupported])

  return {
    isSupported,
    notification,
    ensurePermissions,
    permissionGranted,
    show,
    close,
    onClick,
    onShow,
    onError,
    onClose,
  }
}

/**
 * Return type of `useWebNotification` — upstream `UseWebNotificationReturn` with the Vue
 * shallowRefs flattened to plain values and `EventHookOn<Event>` subscribe functions (same `(fn) =>
 * { off }` shape) for the Notification events.
 */
export interface UseWebNotificationReturn {
  /**
   * Whether the browser supports the Notification API (and can construct a Notification). `false`
   * during render and on the server; settles after the mount effect.
   */
  isSupported: boolean
  /**
   * The most recently shown Notification instance, or `null`.
   */
  notification: Notification | null
  /**
   * Request the notification permission if it's not granted (or denied) yet. Resolves the current
   * `permissionGranted` value, or `undefined` when the Notification API is unsupported.
   */
  ensurePermissions: () => Promise<boolean | undefined>
  /**
   * Whether the notification permission has been granted.
   */
  permissionGranted: boolean
  /**
   * Show a notification built from the hook options merged with `overrides`. Resolves the created
   * Notification, or `undefined` when unsupported / not granted. Sets the `notification` member and
   * wires the Notification's `click`/`show`/`error`/`close` events to the on* hooks.
   */
  show: (overrides?: WebNotificationOptions) => Promise<Notification | undefined>
  /**
   * Close the current notification (if any) and reset `notification`.
   */
  close: () => void
  /**
   * Subscribe to the notification `click` event; returns an `off` handle.
   */
  onClick: (fn: (event: Event) => void) => { off: () => void }
  /**
   * Subscribe to the notification `show` event; returns an `off` handle.
   */
  onShow: (fn: (event: Event) => void) => { off: () => void }
  /**
   * Subscribe to the notification `error` event; returns an `off` handle.
   */
  onError: (fn: (event: Event) => void) => { off: () => void }
  /**
   * Subscribe to the notification `close` event; returns an `off` handle.
   */
  onClose: (fn: (event: Event) => void) => { off: () => void }
}
