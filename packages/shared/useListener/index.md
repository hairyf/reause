---
category: State
---

# useListener

Bind a callback to a listener registration function returned by a reause hook, with automatic cleanup on unmount.

## Usage

```tsx
import { createEventHook, useListener } from '@reause/shared'

const resultEvent = createEventHook<Response>()

useListener(resultEvent, (response) => {
  console.log(response)
})

// elsewhere — deliver an event:
resultEvent.trigger(response)
```

The registration returns the `off` function itself, so when the component
unmounts the listener is automatically unregistered — listeners never leak
and callbacks never fire after the component is gone. (An `on` that returns
nothing provides no cleanup, so that guarantee cannot be made.)

`useListener` accepts either form of the subscription source:

```tsx
// the registration function itself
useListener(resultEvent.on, callback)

// or any object exposing it as `on` — e.g. a `createEventHook()` result
useListener(resultEvent, callback)
```

The callback is kept in a ref: changing `cb` across renders does not
re-register the listener — the latest callback is used by the
already-registered listener. Only when the source itself changes (a new hook
instance, or a new event hook object) does the effect re-run, unregistering
the old listener and registering the new one.
