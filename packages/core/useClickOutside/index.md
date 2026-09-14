---
category: Sensors
---

# useClickOutside

Listen for clicks outside of an element. Useful for modals or dropdowns.

## Usage

```tsx
import { useClickOutside } from '@reause/core'
import { useRef } from 'react'

function App() {
  const target = useRef<HTMLDivElement>(null)

  useClickOutside(target, (event) => {
    console.log(event)
  })

  return (
    <div>
      <div ref={target}>
        Hello world
      </div>
      <div>Outside element</div>
    </div>
  )
}
```

### Return Value

`useClickOutside` returns a `stop` function to remove the event listeners.

```tsx
const stop = useClickOutside(target, handler)

// Later, stop listening
stop()
```

### Controls

If you need more control over triggering the handler, you can use the `controls` option. This returns an object with `stop`, `cancel`, and `trigger` functions.

```tsx
const { stop, cancel, trigger } = useClickOutside(
  modalRef,
  (event) => {
    setModal(false)
  },
  { controls: true },
)

// cancel prevents the next click from triggering the handler
cancel()

// trigger manually fires the handler
trigger(event)

// stop removes all event listeners
stop()
```

> As in upstream, `cancel()` suppresses only the next `click` event that reaches the handler: a physical mouse press re-evaluates the flag in the `pointerdown` listener first, so `cancel()` does not block a subsequent physical click.

### Ignore Elements

Use the `ignore` option to prevent certain elements from triggering the handler. Provide elements as an array of refs or CSS selectors.

```tsx
const ignoreElRef = useRef<HTMLDivElement>(null)

useClickOutside(
  target,
  event => console.log(event),
  { ignore: [ignoreElRef, '.ignore-class', '#ignore-id'] },
)
```

### Capture Phase

By default, the event listener uses the capture phase (`capture: true`). Set `capture: false` to use the bubbling phase instead.

```tsx
useClickOutside(target, handler, { capture: false })
```

### Detect Iframe Clicks

Clicks inside an iframe are not detected by default. Enable `detectIframe` to also trigger the handler when focus moves to an iframe.

```tsx
useClickOutside(target, handler, { detectIframe: true })
```
