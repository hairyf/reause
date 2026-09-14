import type { RefObject } from 'react'
import { useLatest, useUnmount } from '@reause/shared'
import { useEffect, useRef } from 'react'
import { unrefElement } from '../unrefElement'

/** Event names `eventName` accepts — upstream's `DocumentEventKey`. */
type DocumentEventKey = keyof DocumentEventMap

/**
 * One target: a React ref object holding the element, resolved with `unrefElement` (AGENTS.md §2).
 * is wider — it also takes a plain element and a `() => Element` getter, neither of which reause
 * supports.
 */
type ClickAwayTarget = RefObject<Element | null | undefined>

/**
 * Upstream `depsAreSame`: identity first, then element-wise `Object.is`. An equal-but-new array —
 * the inline `['mousedown', 'touchstart']` literal — is equal, so it never re-binds the listeners.
 */
function depsAreSame(oldDeps: readonly unknown[], deps: readonly unknown[]): boolean {
  if (oldDeps === deps)
    return true
  for (let i = 0; i < oldDeps.length; i++) {
    if (!Object.is(oldDeps[i], deps[i]))
      return false
  }
  return true
}

/**
 * Upstream `checkIfAllInShadow`: every target must resolve **and** sit inside a shadow root. A
 * missing target fails the check, so the root stays `document`.
 */
function checkIfAllInShadow(targets: ClickAwayTarget[]): boolean {
  return targets.every((item) => {
    const targetElement = unrefElement(item)
    if (!targetElement)
      return false
    return targetElement.getRootNode() instanceof ShadowRoot
  })
}

/** Upstream `getShadow`. */
function getShadow(node: Element | undefined): Document | ShadowRoot {
  return node ? node.getRootNode() as Document | ShadowRoot : document
}

/** Upstream `getDocumentOrShadow`: the shared `ShadowRoot`, else `document`. */
function getDocumentOrShadow(targets: ClickAwayTarget[]): Document | ShadowRoot {
  if (!targets.length || !document.getRootNode)
    return document
  return checkIfAllInShadow(targets) ? getShadow(unrefElement(targets[0])) : document
}

/**
 * Fire a handler when a click (or any other configured event) lands outside one or more target
 * elements.
 *
 * Map from ahooks `useClickAway`
 * (`source/ahooks/packages/hooks/src/useClickAway/index.ts`). The listener is
 * registered on `document` — or on the shared `ShadowRoot` when every target lives inside one — and
 * calls `handler` with the event as soon as the event lands outside **all** of the targets.
 *
 * React divergences:
 * - **argument order is reversed on purpose.** Upstream ahooks is
 *   `(onClickAway, target, eventName)`; reause puts the target/ref first, so
 *   the call reads `useClickAway(target, handler, eventName)` — consistent with
 *   every other reause DOM hook, where the element comes first. This is an
 *   intentional signature deviation, not a mirroring mistake;
 * - a target is a React ref object (`RefObject`) holding the element, singly or in an array of
 * same-typed refs, per the DOM-hook rule in AGENTS.md §2; each ref is. Resolution happens in the
 * effect and again in the handler, never during render, so a ref attached in this commit is seen
 * and a ref that later points elsewhere is noticed;
 * - the listeners are owned by an effect that runs after **every** commit and
 *   re-binds only when the resolved elements or the event names changed —
 *   upstream's `useEffectWithTarget(target)`. A target that moves to another
 *   element, or into/out of a shadow root, takes the listener with it;
 * - containment is upstream's, short-circuit and all: the handler fires only
 *   when **every** target resolves and **none** contains the event target. A
 *   target that is missing or never attached therefore swallows the event
 *   instead of firing the handler — with no element to be inside of, the click
 *   is not "outside";
 * - a shadow root is a **separate event tree**. When every target lives inside
 *   one, the listener binds there and events from the outer tree — including
 *   the host's own clicks, which the composed path retargets to the host — do
 *   not reach it. That is upstream's consequence too, kept rather than changed;
 * - `handler` is read through `useLatest`, so an inline arrow gets a new
 *   identity on every render without re-registering the listeners;
 * - SSR-safe: nothing touches `document` during render, and.
 *
 * Not a duplicate of `useClickOutside` (VueUse `onClickOutside`): the two are kept side by side on
 * purpose. `useClickAway` is the small ahooks port — a single event name or an array of them,
 * containment by `Element.contains`, and no return value; `useClickOutside` carries the VueUse
 * surface (listening on `window` with `capture: true`, `ignore` selectors, `detectIframe`, a custom
 * `window`) and returns a stop function.
 *
 * @example
 * const target = useRef<HTMLDivElement | null>(null)
 * useClickAway(target, () => setOpen(false))
 *
 * // Other events, single or array — registered and removed symmetrically:
 * useClickAway(target, handler, 'mousedown')
 * useClickAway([target, panelRef], handler, ['mousedown', 'touchstart'])
 */
export function useClickAway<T extends Element>(
  target: RefObject<T | null> | RefObject<T | null>[],
  handler: (event: Event) => void,
  eventName: DocumentEventKey | DocumentEventKey[] = 'click',
): void {
  const handlerRef = useLatest(handler)

  // ── upstream `useEffectWithTarget` ──
  // No dependency array on purpose: the effect runs after **every** commit,
  // re-resolves the targets and re-binds only when the resolved elements or the
  // event names actually changed. The cleanup is held in a ref and run on
  // unmount, so a re-render that changes nothing keeps the current listeners.
  const hasInitRef = useRef(false)
  const lastElementRef = useRef<(Element | undefined)[]>([])
  const lastDepsRef = useRef<readonly unknown[]>([])
  const unLoadRef = useRef<(() => void) | undefined>(undefined)

  useEffect(() => {
    const targets = Array.isArray(target) ? target : [target]
    const els = targets.map(item => unrefElement(item))
    const deps: readonly unknown[] = Array.isArray(eventName) ? eventName : [eventName]

    const effect = (): (() => void) => {
      const eventHandler = (event: Event) => {
        // Upstream's containment test: a target that does not resolve counts as
        // a match, so a missing target swallows the click instead of firing.
        const inside = targets.some((item) => {
          const targetElement = unrefElement(item)
          return !targetElement || targetElement.contains(event.target as Node)
        })

        if (!inside)
          handlerRef.current(event)
      }

      const documentOrShadow = getDocumentOrShadow(targets)
      const eventNames = Array.isArray(eventName) ? eventName : [eventName]

      eventNames.forEach(event => documentOrShadow.addEventListener(event, eventHandler))

      return () => {
        eventNames.forEach(event => documentOrShadow.removeEventListener(event, eventHandler))
      }
    }

    // init run
    if (!hasInitRef.current) {
      hasInitRef.current = true
      lastElementRef.current = els
      lastDepsRef.current = deps
      unLoadRef.current = effect()
      return
    }

    if (
      els.length !== lastElementRef.current.length
      || !depsAreSame(lastElementRef.current, els)
      || !depsAreSame(lastDepsRef.current, deps)
    ) {
      unLoadRef.current?.()
      lastElementRef.current = els
      lastDepsRef.current = deps
      unLoadRef.current = effect()
    }
  })

  useUnmount(() => {
    unLoadRef.current?.()
    // for react-refresh: a remount must init again, not compare against a
    // listener that was already removed (upstream `createEffectWithTarget`)
    hasInitRef.current = false
  })
}
