---
category: Sensors
---

# useClickAway

Fire a handler when a click lands outside one or more target elements — the reause port of ahooks' [`useClickAway`](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useClickAway/index.ts) (`source/ahooks/packages/hooks/src/useClickAway/index.ts`).

A target is a React ref object (`RefObject`) holding the element, single or in a homogeneous array; `eventName` (default `'click'`) is one event name or an array. The listener binds on `document`, or on the shared `ShadowRoot` when **every** target lives inside one, and fires only when **every** target resolves and **none** of them contains the event target — so a target that is missing or not attached yet swallows the click rather than firing. Binding inside a shadow root makes it a separate event tree: events from the outer tree, including the host's own clicks, no longer reach the handler.

The argument order is reause's, not upstream's. ahooks is `useClickAway(onClickAway, target, eventName)`; reause puts the target/ref first, so the hook reads like every other reause DOM hook.

Not a duplicate of [`useClickOutside`](/core/useClickOutside/) (VueUse `onClickOutside`), which keeps the richer VueUse surface — `ignore` selectors, `capture`, `detectIframe`, a custom `window` and a returned `stop`.

## Usage

```tsx
import { useClickAway } from '@reause/core'
import { useRef, useState } from 'react'

function App() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickAway(ref, () => setOpen(false))

  return (
    <div>
      <button type="button" onClick={() => setOpen(value => !value)}>Toggle</button>
      {open && <div ref={ref}>Click outside of me to close</div>}
    </div>
  )
}
```

Several targets, and other events — every name is registered and removed symmetrically:

```tsx
useClickAway([ref1, ref2], () => setOpen(false))
useClickAway(ref, () => setOpen(false), 'mousedown')
useClickAway(ref, () => setOpen(false), ['mousedown', 'touchstart'])
```

The handler is read through a latest-value ref, so an inline arrow never re-registers the listeners; only a change of the resolved target does. The hook returns `void`.

## Type Declarations

```ts
/** Event names `eventName` accepts — upstream's `DocumentEventKey`. */
type DocumentEventKey = keyof DocumentEventMap
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
 *   intentional signature deviation, not a mirroring mistake;
 * - a target is a React ref object (`RefObject`) holding the element, singly or
 *   in an array of same-typed refs, per the DOM-hook rule in AGENTS.md §2; each
 *   ref is resolved with the shared `unrefElement` — upstream's
 *   `getTargetElement` without its plain-element and getter arms. Resolution
 *   happens in the effect and again in the handler, never during render, so a
 *   ref attached in this commit is seen and a ref that later points elsewhere
 *   is noticed;
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
 * - SSR-safe: nothing touches `document` during render, and the listeners bind
 *   in the effect.
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
export declare function useClickAway<T extends Element>(
  target: RefObject<T | null> | RefObject<T | null>[],
  handler: (event: Event) => void,
  eventName?: DocumentEventKey | DocumentEventKey[],
): void
```
