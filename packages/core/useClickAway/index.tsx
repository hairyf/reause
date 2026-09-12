import type { RefOrValue } from '@reause/shared'
import { toArray, toValue, useLatest } from '@reause/shared'
import { useMemo } from 'react'
import { useEventListener } from '../useEventListener'

/**
 * Resolve the listener root the way upstream `getDocumentOrShadow` does: when
 * **all** targets sit inside a shadow root, listen on that shared `ShadowRoot`
 * so clicks originating inside the shadow tree are seen; otherwise fall back to
 * `document`. A missing target counts as "not in a shadow root", which keeps
 * the root on `document` — upstream `checkIfAllInShadow` returns `false` for an
 * unresolved target the same way.
 */
function resolveListenerRoot(targetElements: (Element | null | undefined)[]): Document | ShadowRoot {
  const doc = typeof document === 'undefined' ? undefined : document
  if (!doc || !targetElements.length || !targetElements.every(element => !!element))
    return doc as Document

  const roots = targetElements.map(element => element!.getRootNode())
  return roots.every(root => root instanceof ShadowRoot)
    ? roots[0] as ShadowRoot
    : doc
}

/**
 * Fire a handler when a click (or any other configured event) lands outside one
 * or more target elements.
 *
 * Map from ahooks `useClickAway`
 * (`source/ahooks/packages/hooks/src/useClickAway/index.ts`). The listener is
 * registered on `document` — or on the shared `ShadowRoot` when every target
 * lives inside one — and calls `handler` with the event as soon as the event
 * lands outside **all** of the targets.
 *
 * React divergences:
 * - **argument order is reversed on purpose.** Upstream ahooks is
 *   `(onClickAway, target, eventName)`; reause puts the target/ref first, so
 *   the call reads `useClickAway(target, handler, eventName)` — consistent with
 *   every other reause DOM hook, where the element comes first. This is an
 *   intentional signature deviation, not a mirroring mistake. (The upstream
 *   order is `(handler, target, eventName)`);
 * - a target is a plain element or a React ref-like `{ current }`, singly or in
 *   an array, per the DOM-hook rule in AGENTS.md §2 (`RefOrValue<T>`); both
 *   resolve through the shared `toValue`, which leaves DOM elements alone
 *   (it only unwraps a ref-like `.current`, a `{ value }` plain object or a
 *   getter). ahooks additionally accepts a getter function, which `RefOrValue`
 *   deliberately does not;
 * - `handler` is read through `useLatest`, so an inline arrow gets a new
 *   identity on every render without re-registering the listeners;
 * - the subscription follows the resolved target: when the target moves to
 *   another element — or into/out of a shadow root — the listener is removed
 *   from the old root and registered on the new one, mirroring upstream's
 *   `useEffectWithTarget(target)`. Both the root and the elements a click is
 *   containment-tested against are read through refs, so a re-render that keeps
 *   the same root (`document` → `document`) correctly keeps the listener and
 *   still compares against the **new** element;
 * - a target that is missing or never attached is **outside**: upstream
 *   `!targetElement || targetElement.contains(event.target)` counts an
 *   unresolved target as a match and short-circuits, so with no element to be
 *   inside of, the click fires the handler;
 * - a shadow root is a **separate event tree**. When every target lives inside
 *   one, the listener binds there and events from the outer tree — including
 *   the host's own clicks, which the composed path retargets to the host — do
 *   not reach it. That is upstream's consequence too, kept rather than changed;
 * - SSR-safe: nothing touches `document` during render besides the guarded
 *   lookup, and the listeners bind in the mount effect.
 *
 * Not a duplicate of `useClickOutside` (VueUse `onClickOutside`): the two are
 * kept side by side on purpose. `useClickAway` is the small ahooks port — a
 * single event name or an array of them, containment by `Element.contains`, and
 * no return value; `useClickOutside` carries the VueUse surface (listening on
 * `window` with `capture: true`, `ignore` selectors, `detectIframe`, a custom
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
  target: RefOrValue<T> | RefOrValue<T>[],
  handler: (event: Event) => void,
  eventName?: string | string[],
): void {
  const handlerRef = useLatest(handler)

  // `target` is usually an inline array or a fresh element on every render; the
  // memo keys on the caller's identity so an unchanged target does not churn
  // the values below into a re-bind.
  const targetElements = useMemo(
    () => toArray(target).map(item => toValue(item)),
    [target],
  )

  // Where the listener binds (`document` or the shared `ShadowRoot`) is derived
  // from the resolved elements, so it changes exactly when the targets move
  // between roots.
  const listenerRoot = useMemo(() => resolveListenerRoot(targetElements), [targetElements])

  // Latest-value mirror of the resolved elements, read by the bound listener.
  // The listener itself is latest-tracked by `useEventListener`, but it must not
  // *close over* one render's targets: two different elements share the
  // `document` root, so the subscription may legitimately stay in place while
  // the target changes — without this ref it would keep testing the old element.
  const targetElementsRef = useLatest(targetElements)

  // A fresh array every render is fine: `useEventListener` compares the
  // resolved names element-wise, so an equal-but-new array never re-binds while
  // a genuinely different set of names does.
  const eventNames = Array.isArray(eventName) ? eventName : [eventName ?? 'click']

  useEventListener([listenerRoot], eventNames, (event: Event) => {
    const outside = targetElementsRef.current.every((targetElement) => {
      if (!targetElement)
        return true
      return !(event.target instanceof Node) || !targetElement.contains(event.target)
    })

    if (outside)
      handlerRef.current(event)
  })
}
