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

## Type Declarations

```ts
export type KeyPredicate = (event: KeyboardEvent) => boolean
export type KeyFilter = true | string | string[] | KeyPredicate
export type KeyStrokeEventName = "keydown" | "keypress" | "keyup"
export interface UseKeyStrokeOptions {
  /**
   * Event name to listen to.
   *
   * @default 'keydown'
   */
  eventName?: KeyStrokeEventName
  /**
   * Event target to listen on, as a React ref object (`RefObject`) holding the
   * target.
   *
   * @default window
   */
  target?: RefObject<EventTarget | null | undefined>
  /**
   * Set to `true` to use a passive event listener.
   *
   * @default false
   */
  passive?: boolean
  /**
   * Set to `true` to ignore repeated events when the key is being held down.
   *
   * @default false
   */
  dedupe?: boolean
}
/**
 * Listen for keyboard keystrokes. By default, listens on `keydown` events on `window`.
 *
 * Map from @vueuse/core `onKeyStroke`
 * (`source/vueuse/packages/core/onKeyStroke/`). Accepts a single key, an
 * array of keys, `true` (any key) or a custom predicate as the key filter,
 * and supports the `keypress` / `keyup` events, a custom `target`, `passive`
 * listeners and `dedupe` (ignore repeated
 * [`KeyboardEvent.repeat`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat)
 * events while a key is held down).
 *
 * React divergences:
 * - React has no composable-function API, so this is a hook (upstream's
 *   `onKeyStroke` is a plain function): the listener is registered in a
 *   mount effect and removed on unmount;
 * - the handler is read through a latest-value ref, so new inline handler
 *   identities never cause re-subscription — only resolved
 *   target / event name / passive changes re-bind the listener;
 * - the returned value is a stop function (`() => void`) that removes the
 *   currently registered listener (upstream returns a Vue `Fn` that stops its
 *   internal watcher);
 * - SSR-safe: nothing touches `window` during render — the default window
 *   target only resolves when `window` is defined and binding happens in the
 *   mount effect.
 *
 * @see https://vueuse.org/core/onKeyStroke/
 *
 * @example
 * useKeyStroke('ArrowDown', (e) => {
 *   e.preventDefault()
 * })
 *
 * const stop = useKeyStroke('Escape', handler)
 * stop()
 */
export declare function useKeyStroke(
  key: KeyFilter,
  handler: (event: KeyboardEvent) => void,
  options?: UseKeyStrokeOptions,
): () => void
export declare function useKeyStroke(
  handler: (event: KeyboardEvent) => void,
  options?: UseKeyStrokeOptions,
): () => void
/**
 * Listen to the `keydown` event of the given key.
 *
 * Map from @vueuse/core `onKeyDown`
 * (`source/vueuse/packages/core/onKeyStroke/`) — shorthand for
 * `useKeyStroke(key, handler, { ...options, eventName: 'keydown' })`.
 *
 * @see https://vueuse.org/onKeyStroke
 *
 * @example
 * useKeyDown('ArrowDown', (e) => {
 *   e.preventDefault()
 * })
 */
export declare function useKeyDown(
  key: KeyFilter,
  handler: (event: KeyboardEvent) => void,
  options?: Omit<UseKeyStrokeOptions, "eventName">,
): () => void
/**
 * Listen to the `keypress` event of the given key.
 *
 * Map from @vueuse/core `onKeyPressed`
 * (`source/vueuse/packages/core/onKeyStroke/`) — shorthand for
 * `useKeyStroke(key, handler, { ...options, eventName: 'keypress' })`.
 *
 * @see https://vueuse.org/onKeyStroke
 *
 * @example
 * useKeyPressed('a', (e) => {
 *   console.log(e.key)
 * })
 */
export declare function useKeyPressed(
  key: KeyFilter,
  handler: (event: KeyboardEvent) => void,
  options?: Omit<UseKeyStrokeOptions, "eventName">,
): () => void
/**
 * Listen to the `keyup` event of the given key.
 *
 * Map from @vueuse/core `onKeyUp`
 * (`source/vueuse/packages/core/onKeyStroke/`) — shorthand for
 * `useKeyStroke(key, handler, { ...options, eventName: 'keyup' })`.
 *
 * @see https://vueuse.org/onKeyStroke
 *
 * @example
 * useKeyUp('Shift', () => console.log('Shift key up'))
 */
export declare function useKeyUp(
  key: KeyFilter,
  handler: (event: KeyboardEvent) => void,
  options?: Omit<UseKeyStrokeOptions, "eventName">,
): () => void
```
