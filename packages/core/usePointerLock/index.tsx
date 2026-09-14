import type { RefObject, SyntheticEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

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

interface PointerLockWaiter {
  value: Element | null
  resolve: () => void
  reject: (error: Error) => void
}

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

function isLockEvent(value: ElementRef | Event | SyntheticEvent): value is Event | SyntheticEvent {
  return (typeof Event !== 'undefined' && value instanceof Event)
    || (typeof value === 'object' && value !== null && 'nativeEvent' in value)
}

function resolveElementRef(value: ElementRef): Element | null {
  return unrefElement(value) ?? null
}

/**
 * Map from @vueuse/core `usePointerLock`
 * (`source/vueuse/packages/core/usePointerLock/`). Reactive
 * [pointer lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API): `element`
 * mirrors `document.pointerLockElement` for the lock held through this hook, `lock()` requests it,
 * `unlock()` releases it.
 *
 * React divergences:
 * - the Vue `element`/`triggerElement` refs become plain `Element | null`
 *   state; `isSupported` is resolved in a mount effect so both SSR and the
 *   first client render report `false` (hydration-safe) and the capability
 *   probe never runs during render;
 * - the document `pointerlockchange`/`pointerlockerror` listeners live in a self-contained
 * `useEffect`; the effect re-binds when the `document` option changes;
 * - `lock()` accepts React synthetic events next to native `Event`s —
 *   upstream's `e instanceof Event` check misses them, which would break the
 *   `onMouseDown={lock}` handler idiom;
 * - Vue's `until(element).toBe(...)` becomes a waiter queue resolved by the
 *   `pointerlockchange` handler; on `pointerlockerror` the pending
 *   `lock()`/`unlock()` promise rejects with upstream's
 *   `Failed to {acquire,release} pointer lock.` message (upstream throws
 *   inside the event listener, which leaves the promise pending and cannot
 *   reject the caller);
 * - the `target` argument is read at `lock()` call time (upstream resolves it inside `lock()` too —
 * it is not watched); unmount removes the listeners but never releases an active lock.
 *
 * @example
 * const targetRef = useRef<HTMLDivElement>(null)
 * const { isSupported, element, triggerElement, lock, unlock } = usePointerLock()
 * // <div ref={targetRef} onMouseDown={lock} onMouseUp={unlock} />
 */
export function usePointerLock(target?: ElementRef, options: UsePointerLockOptions = {}): UsePointerLockReturn {
  const [element, setElement] = useState<Element | null>(null)
  const [triggerElement, setTriggerElement] = useState<Element | null>(null)

  // Refs mirror upstream's non-reactive `targetElement` bookkeeping and keep
  // the document listeners + stable lock/unlock callbacks reading the latest
  // values without re-binding.
  const elementRef = useRef<Element | null>(null)
  const targetElementRef = useRef<Element | null>(null)
  const waitersRef = useRef<PointerLockWaiter[]>([])
  const targetRef = useRef<ElementRef | undefined>(target)
  targetRef.current = target

  const doc = options.document ?? (typeof document === 'undefined' ? undefined : document)
  const docRef = useRef<Document | undefined>(doc)
  docRef.current = doc

  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(Boolean(doc && 'pointerLockElement' in doc))
    if (!doc || !('pointerLockElement' in doc))
      return

    const settle = (value: Element | null) => {
      const matched = waitersRef.current.filter(waiter => waiter.value === value)
      waitersRef.current = waitersRef.current.filter(waiter => waiter.value !== value)
      for (const waiter of matched) waiter.resolve()
    }

    const fail = (error: Error) => {
      const pending = waitersRef.current
      waitersRef.current = []
      for (const waiter of pending) waiter.reject(error)
    }

    const onPointerLockChange = () => {
      const locked = doc.pointerLockElement
      const current = locked ?? elementRef.current
      if (targetElementRef.current && current === targetElementRef.current) {
        elementRef.current = locked
        setElement(locked)
        if (locked) {
          settle(locked)
        }
        else {
          targetElementRef.current = null
          setTriggerElement(null)
          settle(null)
        }
      }
    }

    const onPointerLockError = () => {
      const locked = doc.pointerLockElement
      const current = locked ?? elementRef.current
      if (targetElementRef.current && (current === targetElementRef.current || !locked)) {
        const action = locked ? 'release' : 'acquire'
        fail(new Error(`Failed to ${action} pointer lock.`))
      }
    }

    doc.addEventListener('pointerlockchange', onPointerLockChange, { passive: true })
    doc.addEventListener('pointerlockerror', onPointerLockError, { passive: true })

    return () => {
      doc.removeEventListener('pointerlockchange', onPointerLockChange)
      doc.removeEventListener('pointerlockerror', onPointerLockError)
    }
  }, [doc])

  // Resolves when the element state becomes `value` (upstream:
  // `until(element).toBe(...)` / `until(element).toBeNull()`).
  const whenElementIs = useCallback((value: Element | null) => {
    return new Promise<Element | null>((resolve, reject) => {
      if (elementRef.current === value) {
        resolve(value)
        return
      }
      waitersRef.current.push({ value, resolve: () => resolve(value), reject })
    })
  }, [])

  const lock = useCallback(async (e: ElementRef | Event | SyntheticEvent): Promise<Element | null> => {
    const currentDoc = docRef.current
    if (!currentDoc || !('pointerLockElement' in currentDoc))
      throw new Error('Pointer Lock API is not supported by your browser.')

    const event = isLockEvent(e) ? e : null
    const trigger = event ? ((event.currentTarget as Element | null) ?? null) : null
    setTriggerElement(trigger)

    const resolved = isLockEvent(e)
      ? resolveElementRef(targetRef.current ?? { current: null }) ?? trigger
      : resolveElementRef(e)
    if (!resolved)
      throw new Error('Target element undefined.')

    targetElementRef.current = resolved
    resolved.requestPointerLock()

    return await whenElementIs(resolved)
  }, [whenElementIs])

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!elementRef.current)
      return false

    docRef.current?.exitPointerLock()

    await whenElementIs(null)
    return true
  }, [whenElementIs])

  return {
    isSupported,
    element,
    triggerElement,
    lock,
    unlock,
  }
}
