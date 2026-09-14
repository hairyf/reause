---
category: Browser
---

# useWebNotification

Reactive [Notification](https://developer.mozilla.org/en-US/docs/Web/API/notification). The Web Notification interface of the Notifications API is used to configure and display desktop notifications to the user.

## Usage

::: tip
Before an app can send a notification, the user must grant the application the right to do so. The user's OS settings may also prevent expected notification behaviour.
:::

```tsx
import { useWebNotification } from '@reause/core'
import { useEffect } from 'react'

const {
  isSupported,
  notification,
  permissionGranted,
  show,
  close,
  onClick,
  onShow,
  onError,
  onClose,
} = useWebNotification({
  title: 'Hello, reause world!',
  dir: 'auto',
  lang: 'en',
  renotify: true,
  tag: 'test',
})

useEffect(() => {
  if (isSupported && permissionGranted)
    show()
}, [isSupported, permissionGranted, show])
```

```tsx
const { onClick, onShow, onError, onClose } = useWebNotification()

onClick((event) => {
  // Do something with the notification on:click event...
})

onShow((event) => {
  // Do something with the notification on:show event...
})

onError((event) => {
  // Do something with the notification on:error event...
})

onClose((event) => {
  // Do something with the notification on:close event...
})
```

## Type Declarations

```ts
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
  dir?: "auto" | "ltr" | "rtl"
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
export interface UseWebNotificationOptions
  extends ConfigurableWindow, WebNotificationOptions {
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
export declare function useWebNotification(
  options?: UseWebNotificationOptions,
): UseWebNotificationReturn
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
  show: (
    overrides?: WebNotificationOptions,
  ) => Promise<Notification | undefined>
  /**
   * Close the current notification (if any) and reset `notification`.
   */
  close: () => void
  /**
   * Subscribe to the notification `click` event; returns an `off` handle.
   */
  onClick: (fn: (event: Event) => void) => {
    off: () => void
  }
  /**
   * Subscribe to the notification `show` event; returns an `off` handle.
   */
  onShow: (fn: (event: Event) => void) => {
    off: () => void
  }
  /**
   * Subscribe to the notification `error` event; returns an `off` handle.
   */
  onError: (fn: (event: Event) => void) => {
    off: () => void
  }
  /**
   * Subscribe to the notification `close` event; returns an `off` handle.
   */
  onClose: (fn: (event: Event) => void) => {
    off: () => void
  }
}
```
