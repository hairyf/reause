---
category: Sensors
variants: useKeyDown, useKeyUp, useKeyPressed
---

# useKeyStroke

Listen for keyboard keystrokes. By default, listens on `keydown` events on `window`.

## Usage

```tsx
import { useKeyStroke } from '@reause/core'

useKeyStroke('ArrowDown', (e) => {
  e.preventDefault()
})
```

See [this table](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values) for all key codes.

### Return Value

Returns a stop function to remove the event listener.

```tsx
const stop = useKeyStroke('Escape', handler)

// Later, stop listening
stop()
```

### Listen To Multiple Keys

```tsx
useKeyStroke(['s', 'S', 'ArrowDown'], (e) => {
  e.preventDefault()
})

// listen to all keys by passing `true` or skipping the key parameter
useKeyStroke(true, (e) => {
  e.preventDefault()
})
useKeyStroke((e) => {
  e.preventDefault()
})
```

### Custom Key Predicate

You can pass a custom function to determine which keys should trigger the handler.

```tsx
useKeyStroke(
  e => e.key === 'A' && e.shiftKey,
  (e) => {
    console.log('Shift+A pressed')
  },
)
```

### Custom Event Target

```tsx
useKeyStroke('A', (e) => {
  console.log('Key A pressed on document')
}, { target: document })
```

### Ignore Repeated Events

The callback will trigger only once when pressing `A` and **holding down**. The `dedupe` option can also
be a plain boolean — it is read on every received event.

```tsx
useKeyStroke('A', (e) => {
  console.log('Key A pressed')
}, { dedupe: true })
```

Reference: [KeyboardEvent.repeat](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat)

### Passive Mode

Set `passive: true` to use a passive event listener.

```tsx
useKeyStroke('A', handler, { passive: true })
```

### Custom Keyboard Event

```tsx
useKeyStroke('Shift', (e) => {
  console.log('Shift key up')
}, { eventName: 'keyup' })
```

Or

```tsx
useKeyUp('Shift', () => console.log('Shift key up'))
```

## Shorthands

- `useKeyDown` - alias for `useKeyStroke(key, handler, {eventName: 'keydown'})`
- `useKeyPressed` - alias for `useKeyStroke(key, handler, {eventName: 'keypress'})`
- `useKeyUp` - alias for `useKeyStroke(key, handler, {eventName: 'keyup'})`
