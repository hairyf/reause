---
category: Browser
---

# useWakeLock

Reactive [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API). Provides a way to prevent devices from dimming or locking the screen when an application needs to keep running.

## Usage

```tsx
import { useWakeLock } from '@reause/core'

const { isSupported, isActive, forceRequest, request, release } = useWakeLock()
```

When `request` is called, the wake lock will be requested if the document is visible. Otherwise, the request will be queued until the document becomes visible. If the request is successful, `isActive` will be **true**. Whenever the document is hidden, the `isActive` will be **false**.

When `release` is called, the wake lock will be released. If there is a queued request, it will be canceled.

To request a wake lock immediately, even if the document is hidden, use `forceRequest`. Note that this may throw an error if the document is hidden.

## Type Declarations

```ts
/**
 * The type of wake lock to request. Mirrors upstream's own `WakeLockType` (defined locally rather
 * than referenced from lib.dom, for parity with older TS libs) and is re-exported from the package
 * barrel.
 */
export type WakeLockType = "screen"
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
export declare function useWakeLock(
  options?: UseWakeLockOptions,
): UseWakeLockReturn
```
