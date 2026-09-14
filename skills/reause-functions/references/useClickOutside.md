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

## Type Declarations

```ts
export interface UseClickOutsideOptions<
  Controls extends boolean = false,
> extends ConfigurableWindow {
  /**
   * List of elements that should not trigger the event, provided as elements or CSS Selectors.
   */
  ignore?: (Element | string)[]
  /**
   * Use capturing phase for the internal event listener.
   *
   * @default true
   */
  capture?: boolean
  /**
   * Run the handler function if focus moves to an iframe.
   *
   * @default false
   */
  detectIframe?: boolean
  /**
   * Expose more controls. When `true` the return is a `{ stop, cancel, trigger }` object instead of
   * a single stop function: `cancel()` suppresses the next click and `trigger(event)` force-fires
   * the handler.
   *
   * @default false
   */
  controls?: Controls
}
export type UseClickOutsideHandler = (event: PointerEvent | FocusEvent) => void
export interface UseClickOutsideControls {
  /**
   * Remove all registered event listeners.
   */
  stop: () => void
  /**
   * Suppress the next click that reaches the handler.
   */
  cancel: () => void
  /**
   * Force-fire the handler with the given event.
   */
  trigger: (event: Event) => void
}
export type UseClickOutsideReturn<Controls extends boolean = false> =
  Controls extends true ? UseClickOutsideControls : () => void
/**
 * Map from @vueuse/core `onClickOutside`
 * (`source/vueuse/packages/core/onClickOutside/`).
 *
 * @see https://vueuse.org/core/onClickOutside/
 *
 * @example
 * const target = useRef<HTMLDivElement | null>(null)
 * useClickOutside(target, (event) => console.log(event))
 *
 * const stop = useClickOutside(target, handler)
 * stop()
 *
 * const { cancel, trigger } = useClickOutside(target, handler, { controls: true })
 * cancel()
 * trigger(event)
 */
export declare function useClickOutside<T extends UseClickOutsideOptions>(
  target: RefObject<Element | null | undefined>,
  handler: UseClickOutsideHandler,
  options?: T,
): () => void
export declare function useClickOutside(
  target: RefObject<Element | null | undefined>,
  handler: UseClickOutsideHandler,
  options: UseClickOutsideOptions<true>,
): UseClickOutsideControls
```
