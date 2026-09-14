import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { unrefElement } from '../unrefElement'

/**
 * An element (or `Window` / `Document`) whose scrolling can be locked, including `null` /
 * `undefined` while it is not available yet.
 */
export type ScrollLockElement
  = | HTMLElement
    | SVGElement
    | Window
    | Document
    | null
    | undefined

/**
 * The scroll-lock target: a React ref object holding the element (or `Window` / `Document`) — the
 * React equivalent of upstream's `MaybeRefOrGetter<HTMLElement | SVGElement | Window | Document |
 * null | undefined>`. A plain element, a getter and a callback ref are not accepted; the ref is
 * read with the shared `unrefElement`.
 */
export type ScrollLockTarget = RefObject<ScrollLockElement>

/**
 * Return of `useScrollLock`: the current lock state and its setter — `setIsLocked(true)` locks the
 * element, `setIsLocked(false)` unlocks it (the React form of upstream's writable `computed`
 * return).
 */
export type UseScrollLockReturn = [
  isLocked: boolean,
  setIsLocked: (value: boolean) => void,
]

/**
 * Inlined from upstream `_resolve-element.ts`: a `Window` target resolves to its
 * `document.documentElement`, a `Document` target to its `documentElement`, anything else passes
 * through — so the lock logic below always operates on an element. Inlined because reause keeps one
 * file per hook (issue #206 mapping) and source files must not import `@reause/*` helpers (repo
 * ESLint restriction).
 */
function resolveTargetElement(
  element: ScrollLockElement,
): HTMLElement | SVGElement | null | undefined {
  if (typeof Window !== 'undefined' && element instanceof Window)
    return element.document.documentElement

  if (typeof Document !== 'undefined' && element instanceof Document)
    return element.documentElement

  return element as HTMLElement | SVGElement | null | undefined
}

/**
 * Resolve the hook's target ref to the element the lock operates on: the ref's `current` (through
 * the shared `unrefElement`) mapped by `resolveTargetElement`. The ref is re-read whenever `lock` /
 * `unlock` run and whenever the effects run, so a ref attached after the first render is honoured.
 */
function resolveElement(target: ScrollLockTarget): HTMLElement | SVGElement | null | undefined {
  return resolveTargetElement(unrefElement(target))
}

/**
 * Upstream computes `isIOS` once at module load from `@vueuse/shared` (`isClient &&
 * /iP(ad|hone|od)/.test(userAgent)`); reause checks at lock/unlock time instead so the iOS fallback
 * is testable — identical behavior.
 */
function checkIsIOS(): boolean {
  return typeof window !== 'undefined'
    && !!window.navigator?.userAgent
    && /iP(?:ad|hone|od)/.test(window.navigator.userAgent)
}

function checkOverflowScroll(ele: Element): boolean {
  const style = window.getComputedStyle(ele)
  if (
    style.overflowX === 'scroll'
    || style.overflowY === 'scroll'
    || (style.overflowX === 'auto' && ele.clientWidth < ele.scrollWidth)
    || (style.overflowY === 'auto' && ele.clientHeight < ele.scrollHeight)
  ) {
    return true
  }

  const parent = ele.parentNode as Element

  if (!parent || parent.tagName === 'BODY')
    return false

  return checkOverflowScroll(parent)
}

function preventDefault(rawEvent: TouchEvent): boolean {
  const e = rawEvent || (window.event as TouchEvent)

  const _target = e.target as Element

  // Do not prevent if element or parentNodes have overflow: scroll set.
  if (checkOverflowScroll(_target))
    return false

  // Do not prevent if the event has more than one touch (usually meaning this
  // is a multi touch gesture like pinch to zoom).
  if (e.touches.length > 1)
    return true

  if (e.preventDefault)
    e.preventDefault()

  return false
}

// Shared across hook instances (upstream behavior): remembers the first-seen
// inline overflow of an element so `unlock` and the element re-sync can tell
// an externally applied `hidden` from the hook's own.
const elInitialOverflow = new WeakMap<HTMLElement, CSSStyleDeclaration['overflow']>()

/**
 * Map from @vueuse/core `useScrollLock`
 * (`source/vueuse/packages/core/useScrollLock/`). Locks scrolling of the
 * element by toggling its inline `overflow` style. Upstream's `_resolve-element` target resolution
 * and the iOS `touchmove` fallback helpers (`checkOverflowScroll` / `preventDefault`) are inlined
 * into this single file per the issue #206 mapping (reause keeps one file per hook); the upstream
 * `vScrollLock` directive variant has no React equivalent and is not ported.
 *
 * - upstream returns a writable `computed` (`isLocked.value = true/false`);
 *   React gets the `[isLocked, setIsLocked]` tuple — `setIsLocked(true)`
 *   locks, `setIsLocked(false)` unlocks, mirroring the computed setter. The
 *   setter is stable, and the internal lock flag updates synchronously so
 *   repeated calls in one tick behave like upstream's sync ref.
 * - the target is a React ref object (`RefObject`) holding the element (or `Window` / `Document`)
 * when `lock` / `unlock` run and when the sync / cleanup effects run, so a ref attached after the
 * first render is locked and unlocked. Mutating the ref's `.current` while locked does not re-sync
 * the DOM without a re-render — re-render for the sync effect to run again, mirroring upstream's
 * `watch` re-firing on ref change.
 * - the immediate `watch(element, …)` sync becomes an effect keyed on the
 *   render-time resolved element identity that re-resolves the target when it
 *   runs (commit time): it records the element's initial overflow, adopts an
 *   already-`hidden` element as locked (external CSS or another hook
 *   instance), and applies `hidden` while locked.
 * - `tryOnScopeDispose(unlock)` becomes an unmount cleanup restoring the
 *   element's initial overflow. The state flip is skipped in the cleanup on
 *   purpose: it is unobservable after a real unmount, and keeping the
 *   internal lock flag intact lets React StrictMode's effect remount
 *   re-apply the lock through the sync effect.
 * - the initial-overflow cache is a module-level `WeakMap` shared by all
 *   hook instances pointing at the same element (upstream behavior): with
 *   two hooks on one element, the second `unlock` restores the shared
 *   initial overflow while the first instance still reports locked.
 * - swapping to a different element does not restore the previous element's
 *   overflow (upstream `watch` behavior) — the new element is synced instead.
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const [isLocked, setIsLocked] = useScrollLock(el)
 *
 * setIsLocked(true) // lock
 * setIsLocked(false) // unlock
 */
export function useScrollLock(
  element: ScrollLockTarget,
  initialState = false,
): UseScrollLockReturn {
  const [isLocked, setIsLocked] = useState(initialState)

  // latest-value mirror of the raw target, synced each render (house pattern):
  // the element is resolved from it when `lock` / `unlock` run and when the
  // effects run (commit time), so a ref attached after the first render is
  // still honoured — upstream re-resolves `toValue(element)` the same way
  const targetRef = useRef<ScrollLockTarget>(element)
  targetRef.current = element

  const isLockedRef = useRef(initialState)
  const initialOverflowRef = useRef<CSSStyleDeclaration['overflow']>('')
  const stopTouchMoveRef = useRef<(() => void) | null>(null)

  // resolved during render only to key the sync effect on the element identity
  // (a pure `unrefElement` read of the ref — no DOM access, so SSR renders the
  // bare state)
  const target = resolveElement(element)

  const resolveCurrentElement = useCallback(
    () => resolveElement(targetRef.current),
    [],
  )

  const lock = useCallback(() => {
    const ele = resolveCurrentElement()
    if (!ele || isLockedRef.current)
      return

    if (checkIsIOS()) {
      const onTouchMove = (rawEvent: Event) => {
        preventDefault(rawEvent as TouchEvent)
      }
      ele.addEventListener('touchmove', onTouchMove, { passive: false })
      stopTouchMoveRef.current = () => {
        ele.removeEventListener('touchmove', onTouchMove)
      }
    }

    ele.style.overflow = 'hidden'
    isLockedRef.current = true
    setIsLocked(true)
  }, [resolveCurrentElement])

  const unlock = useCallback(() => {
    const ele = resolveCurrentElement()
    if (!ele || !isLockedRef.current)
      return

    if (checkIsIOS())
      stopTouchMoveRef.current?.()

    ele.style.overflow = initialOverflowRef.current
    elInitialOverflow.delete(ele as HTMLElement)
    isLockedRef.current = false
    setIsLocked(false)
  }, [resolveCurrentElement])

  const setIsLockedStable = useCallback((value: boolean) => {
    if (value)
      lock()
    else
      unlock()
  }, [lock, unlock])

  // mirror of upstream's immediate `watch(element, …)`: record the element's
  // initial overflow, adopt an already-`hidden` element as locked, and apply
  // `hidden` while locked — re-runs when the rendered element identity
  // changes, and resolves the target at commit time so an element attached
  // during this commit is picked up
  useEffect(() => {
    const ele = resolveCurrentElement() as HTMLElement | null | undefined
    if (!ele)
      return

    if (!elInitialOverflow.get(ele))
      elInitialOverflow.set(ele, ele.style.overflow)

    if (ele.style.overflow !== 'hidden')
      initialOverflowRef.current = ele.style.overflow

    if (ele.style.overflow === 'hidden') {
      isLockedRef.current = true
      setIsLocked(true)
      return
    }

    if (isLockedRef.current)
      ele.style.overflow = 'hidden'
  }, [target, resolveCurrentElement])

  // mirror of upstream's `tryOnScopeDispose(unlock)` — restore the element's
  // initial overflow on unmount. The state flip is intentionally skipped: it
  // is unobservable after a real unmount, and keeping `isLockedRef` intact
  // lets React StrictMode's effect remount re-apply the lock above.
  useEffect(() => () => {
    const ele = resolveCurrentElement() as HTMLElement | null | undefined
    if (!ele || !isLockedRef.current)
      return

    if (checkIsIOS())
      stopTouchMoveRef.current?.()

    ele.style.overflow = initialOverflowRef.current
    elInitialOverflow.delete(ele)
  }, [resolveCurrentElement])

  return [isLocked, setIsLockedStable]
}
