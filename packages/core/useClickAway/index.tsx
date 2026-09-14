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
 * Map from ahooks `useClickAway`
 * (`source/ahooks/packages/hooks/src/useClickAway/index.ts`).
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
