---
category: Elements
---

# useDraggable

Make elements draggable.

## Usage

```tsx
import { useDraggable } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLDivElement>(null)

// `style` will be a helper string for `left: ?px; top: ?px;`
const { x, y, style } = useDraggable(el, {
  initialValue: { x: 40, y: 40 },
})
```

```tsx
// `style` is a helper string for `left: ?px; top: ?px;` — convert it into a
// React style object for the `style` prop (or use `x` / `y` directly)
function styleStringToObject(style: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const declaration of style.split(';')) {
    const [key, value] = declaration.split(':').map(part => part.trim())
    if (key && value)
      result[key] = value
  }
  return result
}

<div ref={el} style={{ position: 'fixed', ...styleStringToObject(style) }}>
  Drag me! I am at
  {' '}
  {x}
  ,
  {' '}
  {y}
</div>
```

### Return Values

| State        | Type       | Description                             |
| ------------ | ---------- | --------------------------------------- |
| `x`          | `number`   | Current x position                      |
| `y`          | `number`   | Current y position                      |
| `position`   | `Position` | Current position object                 |
| `isDragging` | `boolean`  | Whether currently dragging              |
| `style`      | `string`   | CSS style string `left: ?px; top: ?px;` |

### Options

```ts
useDraggable(el, {
  // Initial position (default: { x: 0, y: 0 })
  initialValue: { x: 40, y: 40 },
  // Restrict dragging to specific axis: 'x', 'y', or 'both' (default)
  axis: 'both',
  // Only trigger when clicking directly on the element (default: false)
  exact: false,
  // Prevent default browser behavior (default: false)
  preventDefault: true,
  // Stop event propagation (default: false)
  stopPropagation: false,
  // Use capture phase for events (default: true)
  capture: true,
  // Disable dragging (default: false)
  disabled: false,
  // Mouse buttons that trigger drag (default: [0] - left button)
  buttons: [0],
  // Pointer types to listen to (default: ['mouse', 'touch', 'pen'])
  pointerTypes: ['mouse', 'touch', 'pen'],
  // Custom drag handle element (default: target element)
  handle: handleRef,
  // Container element for bounds (default: none)
  containerElement: containerRef,
  // Element to attach pointermove/pointerup events (default: window)
  draggingElement: window,
  // Callbacks
  onStart: (position, event) => {
    // Return false to prevent dragging
  },
  onMove: (position, event) => {},
  onEnd: (position, event) => {},
})
```

### Prevent Default

Set `preventDefault: true` to override the default drag-and-drop behavior of certain elements in the browser (e.g., images).

```ts
import { useDraggable } from '@reause/core'

const { x, y, style } = useDraggable(el, {
  preventDefault: true,
})
```

### Container Bounds

Use `containerElement` to constrain dragging within a container.

```ts
const { x, y } = useDraggable(el, {
  containerElement: containerRef,
})
```

Set `autoScroll: true` to enable auto-scroll when dragging near the edges.

```ts
const { x, y, style } = useDraggable(el, {
  autoScroll: {
    speed: 2, // Control the speed of auto-scroll.
    margin: 30, // Set the margin from the edge that triggers auto-scroll.
    direction: 'both', // Determine the direction of auto-scroll.
  },
})
```

## Type Declarations

```ts
export interface Position {
  x: number
  y: number
}
export type DraggableTarget = RefObject<
  HTMLElement | SVGElement | null | undefined
>
export type DraggableElement = RefObject<
  HTMLElement | SVGElement | Window | Document | null | undefined
>
export type DraggableContainer = RefObject<
  HTMLElement | SVGElement | null | undefined
>
export interface UseDraggableOptions {
  /**
   * Only start the dragging when click on the element directly
   *
   * @default false
   */
  exact?: boolean
  /**
   * Prevent events defaults
   *
   * @default false
   */
  preventDefault?: boolean
  /**
   * Prevent events propagation
   *
   * @default false
   */
  stopPropagation?: boolean
  /**
   * Whether dispatch events in capturing phase
   *
   * @default true
   */
  capture?: boolean
  /**
   * Element to attach `pointermove` and `pointerup` events to.
   *
   * @default window
   */
  draggingElement?: DraggableElement
  /**
   * Element for calculating bounds (If not set, it will use the event's target).
   *
   * @default undefined
   */
  containerElement?: DraggableContainer
  /**
   * Handle that triggers the drag event
   *
   * @default target
   */
  handle?: DraggableTarget
  /**
   * Pointer types that listen to.
   *
   * @default ['mouse', 'touch', 'pen']
   */
  pointerTypes?: PointerType[]
  /**
   * Initial position of the element.
   *
   * @default { x: 0, y: 0 }
   */
  initialValue?: Position
  /**
   * Callback when the dragging starts. Return `false` to prevent dragging.
   */
  onStart?: (position: Position, event: PointerEvent) => void | false
  /**
   * Callback during dragging.
   */
  onMove?: (position: Position, event: PointerEvent) => void
  /**
   * Callback when dragging end.
   */
  onEnd?: (position: Position, event: PointerEvent) => void
  /**
   * Axis to drag on.
   *
   * @default 'both'
   */
  axis?: "x" | "y" | "both"
  /**
   * Disabled drag and drop.
   *
   * @default false
   */
  disabled?: boolean
  /**
   * Mouse buttons that are allowed to trigger drag events.
   *
   * - `0`: Main button, usually the left button or the un-initialized state
   * - `1`: Auxiliary button, usually the wheel button or the middle button (if present)
   * - `2`: Secondary button, usually the right button
   * - `3`: Fourth button, typically the Browser Back button
   * - `4`: Fifth button, typically the Browser Forward button
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button#value
   * @default [0]
   */
  buttons?: number[]
  /**
   * Whether to restrict dragging within the visible area of the container.
   *
   * If enabled, the draggable element will not leave the visible area of its container, ensuring it
   * remains within the viewport of the container during the drag.
   *
   * @default false
   */
  restrictInView?: boolean
  /**
   * Whether to enable auto-scroll when dragging near the edges.
   *
   * @default false
   */
  autoScroll?:
    | boolean
    | {
        /**
         * Speed of auto-scroll.
         *
         * @default 2
         */
        speed?: number | Position
        /**
         * Margin from the edge to trigger auto-scroll.
         *
         * @default 30
         */
        margin?: number | Position
        /**
         * Direction of auto-scroll.
         *
         * @default 'both'
         */
        direction?: "x" | "y" | "both"
      }
}
export interface UseDraggableReturn {
  x: number
  y: number
  position: Position
  isDragging: boolean
  style: string
  /**
   * Set the x position — the React equivalent of assigning upstream's writable `x` ref. Updates the
   * returned `x`, `position` and `style` together with the internal drag position.
   */
  setX: (value: number) => void
  /**
   * Set the y position — the React equivalent of assigning upstream's writable `y` ref. Updates the
   * returned `y`, `position` and `style` together with the internal drag position.
   */
  setY: (value: number) => void
}
/**
 * Map from @vueuse/core `useDraggable`
 * (`source/vueuse/packages/core/useDraggable/`).
 *
 * @example
 * const el = useRef<HTMLDivElement>(null)
 * const { x, y, style } = useDraggable(el, { initialValue: { x: 40, y: 40 } })
 */
export declare function useDraggable(
  target: DraggableTarget,
  options?: UseDraggableOptions,
): UseDraggableReturn
```
