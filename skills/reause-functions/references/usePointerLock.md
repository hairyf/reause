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
 * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
 */
export interface UsePointerLockOptions {
  document?: Document
}
/**
 * Element ref or nothing (reause binds DOM targets to a React ref only; the ref is resolved at
 * `lock()` call time, mirroring upstream's `unrefElement`).
 */
type ElementRef = RefObject<Element | null | undefined>
export interface UsePointerLockReturn {
  /**
   * Whether the Pointer Lock API is supported by the resolved document.
   */
  isSupported: boolean
  /**
   * Currently locked element (`document.pointerLockElement` while this hook holds the lock), or
   * `null`.
   */
  element: Element | null
  /**
   * Element that triggered the current lock — the event's `currentTarget` when `lock()` was called
   * with an event, otherwise `null`. Reset when the lock is released.
   */
  triggerElement: Element | null
  /**
   * Request pointer lock. Accepts an element, a React ref, or an event (native or React synthetic):
   * with an event the hook-level `target` is preferred, then the event's `currentTarget` (upstream
   * order). Resolves with the locked element once `document.pointerLockElement` reports it; rejects
   * when the lock cannot be acquired.
   */
  lock: (e: ElementRef | Event | SyntheticEvent) => Promise<Element | null>
  /**
   * Release the current pointer lock. Resolves `true` when a lock was held and released, `false`
   * when nothing was locked.
   */
  unlock: () => Promise<boolean>
}
/**
 * Map from @vueuse/core `usePointerLock`
 * (`source/vueuse/packages/core/usePointerLock/`).
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
