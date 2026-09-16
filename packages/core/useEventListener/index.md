---
category: Browser
---

# useEventListener

Use EventListener with ease. Register using [`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) on mounted, and [`removeEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener) automatically on unmounted

## Usage

```tsx
import { useEventListener } from '@reause/core'
import { useRef } from 'react'

const button = useRef<HTMLButtonElement>(null)

useEventListener(button, 'click', (evt) => {
  console.log(evt)
})
```

Every target is a React ref, and the listener is typed by that target's own event map — `evt` above is a `PointerEvent`.

### Default Target

When the target is omitted, it defaults to `window`:

```tsx
import { useEventListener } from '@reause/core'

// Listens on window
useEventListener('resize', (evt) => {
  console.log(evt)
})
```

### Reactive Target

You can pass a ref as the event target, `useEventListener` will unregister the previous event and register the new one when the target changes:

```tsx
import { useEventListener } from '@reause/core'
import { useRef } from 'react'

const element = useRef<HTMLDivElement>(null)
useEventListener(element, 'keydown', (e) => {
  console.log(e.key)
})
```

### Multiple Events

You can pass an array of events to listen to multiple events at once:

```tsx
const element = useRef<HTMLDivElement>(null)
useEventListener(element, ['mouseenter', 'mouseleave'], (evt) => {
  console.log(evt.type)
})
```

### Multiple Targets

You can also pass an array of targets:

```tsx
const first = useRef<HTMLButtonElement>(null)
const second = useRef<HTMLButtonElement>(null)
useEventListener([first, second], 'click', (evt) => {
  console.log('Button clicked')
})
```

### Cleanup

Returns a cleanup function to manually unregister the listener:

```tsx
const element = useRef<HTMLDivElement>(null)
const cleanup = useEventListener(element, 'keydown', (e) => {
  console.log(e.key)
})

cleanup() // This will unregister the listeners.
```

`useEventListener` is SSR-safe: nothing touches `window` during render, and binding happens in the mount effect.
