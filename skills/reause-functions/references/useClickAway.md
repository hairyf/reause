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
export declare function useClickAway<T extends Element>(
  target: RefObject<T | null> | RefObject<T | null>[],
  handler: (event: Event) => void,
  eventName?: DocumentEventKey | DocumentEventKey[],
): void
```
