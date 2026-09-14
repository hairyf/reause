---
category: Sensors
---

# useClickAway

Fire a handler when a click lands outside one or more target elements.

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
