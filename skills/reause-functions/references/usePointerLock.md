---
category: Sensors
---

# usePointerLock

Reactive [pointer lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API)

## Basic Usage

```tsx
import { usePointerLock } from '@reause/core'

const targetRef = useRef<HTMLDivElement>(null)
const { isSupported, element, triggerElement, lock, unlock } = usePointerLock()

// <div ref={targetRef} onMouseDown={lock} onMouseUp={unlock} />
// lock(targetRef) — lock a specific element or ref
// lock(event) — lock the event's currentTarget (hook-level target first, if set)
// element mirrors document.pointerLockElement while the lock is held
```

## Type Declarations

```ts
/**
 * Specify a custom `document` instance, e.g. working with iframes or in
 * testing environments.
 */
export interface UsePointerLockOptions {
  document?: Document
}
/**
 * Element ref or nothing — the React analog of upstream's `ElementRef`
 * (reause binds DOM targets to a React ref only; the ref is resolved at
 * `lock()` call time, mirroring upstream's `unrefElement`).
 */
type ElementRef = RefObject<Element | null | undefined>
export interface UsePointerLockReturn {
  /**
   * Whether the Pointer Lock API is supported by the resolved document.
   */
  isSupported: boolean
  /**
   * Currently locked element (`document.pointerLockElement` while this hook
   * holds the lock), or `null`.
   */
  element: Element | null
  /**
   * Element that triggered the current lock — the event's `currentTarget`
   * when `lock()` was called with an event, otherwise `null`. Reset when the
   * lock is released.
   */
  triggerElement: Element | null
  /**
   * Request pointer lock. Accepts an element, a React ref, or an event
   * (native or React synthetic): with an event the hook-level `target` is
   * preferred, then the event's `currentTarget` (upstream order). Resolves
   * with the locked element once `document.pointerLockElement` reports it;
   * rejects when the lock cannot be acquired.
   */
  lock: (e: ElementRef | Event | SyntheticEvent) => Promise<Element | null>
  /**
   * Release the current pointer lock. Resolves `true` when a lock was held
   * and released, `false` when nothing was locked.
   */
  unlock: () => Promise<boolean>
}
/**
 * React port of VueUse's `usePointerLock`.
 *
 * Map from @vueuse/core `usePointerLock`
 * (`source/vueuse/packages/core/usePointerLock/`). Reactive
 * [pointer lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API):
 * `element` mirrors `document.pointerLockElement` for the lock held through
 * this hook, `lock()` requests it, `unlock()` releases it.
 *
 * React divergences:
 * - the Vue `element`/`triggerElement` refs become plain `Element | null`
 *   state; `isSupported` is resolved in a mount effect so both SSR and the
 *   first client render report `false` (hydration-safe) and the capability
 *   probe never runs during render;
 * - the document `pointerlockchange`/`pointerlockerror` listeners live in a
 *   self-contained `useEffect` (upstream uses `useEventListener`) and are
 *   removed on unmount; the effect re-binds when the `document` option
 *   changes;
 * - `lock()` accepts React synthetic events next to native `Event`s —
 *   upstream's `e instanceof Event` check misses them, which would break the
 *   `onMouseDown={lock}` handler idiom;
 * - Vue's `until(element).toBe(...)` becomes a waiter queue resolved by the
 *   `pointerlockchange` handler; on `pointerlockerror` the pending
 *   `lock()`/`unlock()` promise rejects with upstream's
 *   `Failed to {acquire,release} pointer lock.` message (upstream throws
 *   inside the event listener, which leaves the promise pending and cannot
 *   reject the caller);
 * - the `target` argument is read at `lock()` call time (upstream resolves it
 *   inside `lock()` too — it is not watched); unmount removes the listeners
 *   but never releases an active lock (upstream has no scope-dispose unlock).
 *
 * @example
 * const targetRef = useRef<HTMLDivElement>(null)
 * const { isSupported, element, triggerElement, lock, unlock } = usePointerLock()
 * // <div ref={targetRef} onMouseDown={lock} onMouseUp={unlock} />
 */
export declare function usePointerLock(
  target?: ElementRef,
  options?: UsePointerLockOptions,
): UsePointerLockReturn
```
