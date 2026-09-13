---
category: Sensors
---

# useClickAway

Fire a handler when a click lands outside one or more target elements — the reause port of ahooks' [`useClickAway`](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useClickAway/index.ts) (upstream mapping files: `source/ahooks/packages/hooks/src/useClickAway/index.ts`, 50 LOC, its `index.en-US.md` / `index.zh-CN.md` docs, and the `demo/demo1..6.tsx` demos). A single element or an array of elements may be passed, each as a plain element or a React ref; a click anywhere outside **all** of them calls the handler with the event.

The argument order is deliberately **not** upstream's. ahooks is `useClickAway(onClickAway, target, eventName)`, while reause puts the target/ref first — `useClickAway(ref, () => setOpen(false), 'click')` — so the hook reads like every other reause DOM hook, where the element comes first; the recorded upstream order is `(handler, target, eventName)`.

The listener is registered on `document`, or on the containing `ShadowRoot` when **every** target lives inside one, so a click originating inside a shadow tree is seen as well. A target that is missing or never attached counts as **outside**: with no element to contain the event there is nothing for the click to be inside of, which is how upstream's `getTargetElement` branch behaves too. Note the consequence of binding inside a shadow root — it is a separate event tree, so once the listener lives there, events from the outer tree (including the host's own clicks, which the composed path retargets to the host) do not reach the handler; that is upstream's behaviour as well, kept rather than changed.

This is **not** a duplicate of `useClickOutside` (VueUse `onClickOutside`) — the two are kept side by side on purpose. `useClickAway` is the small ahooks port: a single `eventName` or an array of them, containment by `Element.contains`, and no return value. `useClickOutside` is the richer VueUse surface: it listens on `window` with `capture: true`, takes `ignore` selectors, `detectIframe` and a custom `window`, and returns a stop function (with `controls: true`, a `{ stop, cancel, trigger }` object). Reach for `useClickAway` when a click outside a ref should close a dropdown and nothing more; reach for `useClickOutside` when the listener options themselves are part of the requirement.

## Usage

```tsx
import { useClickAway } from '@reause/core'
import { useRef, useState } from 'react'

function App() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // target/ref first — the reause order (upstream is `(handler, target, eventName)`)
  useClickAway(ref, () => {
    setOpen(false)
  })

  return (
    <div>
      <button type="button" onClick={() => setOpen(value => !value)}>Toggle</button>
      {open && <div ref={ref}>Click outside of me to close</div>}
    </div>
  )
}
```

Several targets may be passed at once, and a click inside any of them does not fire:

```tsx
const ref1 = useRef<HTMLButtonElement>(null)
const ref2 = useRef<HTMLButtonElement>(null)

useClickAway([ref1, ref2], () => setOpen(false))
```

`eventName` defaults to `'click'` and may be a single name or an array; every name is registered and removed symmetrically:

```tsx
useClickAway(ref, () => setOpen(false), 'mousedown')
useClickAway(ref, () => setOpen(false), ['mousedown', 'touchstart'])
```

The handler is read through a latest-value ref, so an inline arrow does not re-register the listeners on every render — only a change of the resolved target does. The hook returns `void`.

## Type Declarations

```ts
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
export declare function useClickAway<T extends Element>(
  target: RefOrValue<T> | RefOrValue<T>[],
  handler: (event: Event) => void,
  eventName?: string | string[],
): void
```
