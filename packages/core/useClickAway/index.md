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
