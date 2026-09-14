---
category: Sensors
---

# useLongPress

Listen for a long press on an element. Returns a stop function.

## Usage

```tsx
import { useLongPress } from '@reause/core'
import { useRef, useState } from 'react'

const htmlRefHook = useRef<HTMLButtonElement | null>(null)
const [longPressedHook, setLongPressedHook] = useState(false)

function onLongPressCallbackHook(e: PointerEvent) {
  setLongPressedHook(true)
}
function resetHook() {
  setLongPressedHook(false)
}

useLongPress(
  htmlRefHook,
  onLongPressCallbackHook,
  {
    modifiers: {
      prevent: true,
    },
  },
)

return (
  <>
    <p>
      Long Pressed:
      {longPressedHook ? 'true' : 'false'}
    </p>

    <button ref={htmlRefHook} className="ml-2 button small">
      Press long
    </button>

    <button className="ml-2 button small" onClick={resetHook}>
      Reset
    </button>
  </>
)
```

### Custom Delay

By default, the handler fires after 500ms. You can customize this with the `delay` option. It can be a number or a function that receives the `PointerEvent`.

```tsx
import { useLongPress } from '@reause/core'

// Fixed delay
useLongPress(target, handler, { delay: 1000 })

// Dynamic delay based on event
useLongPress(target, handler, {
  delay: ev => ev.pointerType === 'touch' ? 800 : 500,
})
```

### Distance Threshold

The long press will be canceled if the pointer moves more than the threshold (default: 10 pixels). Set to `false` to disable movement detection.

```tsx
import { useLongPress } from '@reause/core'

// Custom threshold
useLongPress(target, handler, { distanceThreshold: 20 })

// Disable movement detection
useLongPress(target, handler, { distanceThreshold: false })
```

### On Mouse Up Callback

You can provide an `onMouseUp` callback to be notified when the pointer is released.

```tsx
import { useLongPress } from '@reause/core'

useLongPress(target, handler, {
  onMouseUp(duration, distance, isLongPress, pointerEvent) {
    console.log(`Held for ${duration}ms, moved ${distance}px, long press: ${isLongPress}, x: ${pointerEvent.clientX}`)
  },
})
```

### Modifiers

The following modifiers are available:

| Modifier  | Description                                  |
| --------- | -------------------------------------------- |
| `stop`    | Calls `event.stopPropagation()`              |
| `once`    | Removes event listener after first trigger   |
| `prevent` | Calls `event.preventDefault()`               |
| `capture` | Uses capture mode for event listener         |
| `self`    | Only trigger if target is the element itself |

```tsx
useLongPress(target, handler, {
  modifiers: {
    prevent: true,
    stop: true,
  },
})
```

## Component Usage

Not ported — upstream ships a `OnLongPress` component (Vue, render-slot based); in React the hook is used directly.

## Directive Usage

Not ported — upstream ships a `vOnLongPress` directive (Vue, `v-` directive); in React the hook is used directly.

## Type Declarations

```ts
export interface UseLongPressModifiers {
  /**
   * Calls `event.stopPropagation()` on the pointer events.
   *
   * @default undefined
   */
  stop?: boolean
  /**
   * Removes the event listener after the first trigger.
   *
   * @default undefined
   */
  once?: boolean
  /**
   * Calls `event.preventDefault()` on the pointer events.
   *
   * @default undefined
   */
  prevent?: boolean
  /**
   * Uses capture mode for the event listener.
   *
   * @default undefined
   */
  capture?: boolean
  /**
   * Only triggers if the event target is the element itself.
   *
   * @default undefined
   */
  self?: boolean
}
export interface UseLongPressOptions {
  /**
   * Time in ms till `longpress` gets called
   *
   * @default 500
   */
  delay?: number | ((ev: PointerEvent) => number)
  modifiers?: UseLongPressModifiers
  /**
   * Allowance of moving distance in pixels, the action will get canceled when moving too far from
   * the pointerdown position.
   *
   * @default 10
   */
  distanceThreshold?: number | false
  /**
   * Function called when the ref element is released.
   *
   * @param duration how long the element was pressed in ms
   * @param distance distance from the pointerdown position
   * @param isLongPress whether the action was a long press or not
   * @param pointerEvent the native {@link PointerEvent} triggered by the browser
   */
  onMouseUp?: (
    duration: number,
    distance: number,
    isLongPress: boolean,
    pointerEvent: PointerEvent,
  ) => void
}
export type UseLongPressReturn = () => void
/**
 * Map from @vueuse/core `onLongPress`
 * (`source/vueuse/packages/core/onLongPress/`).
 *
 * @see https://vueuse.org/core/onLongPress/
 *
 * @example
 * const target = useRef<HTMLButtonElement | null>(null)
 * const [longPressed, setLongPressed] = useState(false)
 *
 * useLongPress(target, () => {
 *   setLongPressed(true)
 * })
 *
 * const stop = useLongPress(target, handler, { delay: 1000 })
 * stop()
 */
export declare function useLongPress(
  target: RefObject<EventTarget | null | undefined>,
  handler: (evt: PointerEvent) => void,
  options?: UseLongPressOptions,
): UseLongPressReturn
```
