---
category: Sensors
---

# usePointer

Reactive pointer state

## Basic Usage

```tsx
import { usePointer } from '@reause/core'

const { x, y, pressure, pointerType, isInside } = usePointer()

// only let `pen` pointers update the state
const pen = usePointer({ pointerTypes: ['pen'] })
```

## Type Declarations

```ts
/**
 * Pointer device type reported by `PointerEvent.pointerType`.
 */
export type PointerType = "mouse" | "touch" | "pen"
export interface UsePointerState {
  x: number
  y: number
  pointerId: number
  pressure: number
  tiltX: number
  tiltY: number
  width: number
  height: number
  twist: number
  pointerType: PointerType | null
}
export interface UsePointerOptions extends ConfigurableWindow {
  /**
   * Pointer types that listen to.
   *
   * @default ['mouse', 'touch', 'pen']
   */
  pointerTypes?: PointerType[]
  /**
   * Initial values.
   */
  initialValue?: Partial<UsePointerState>
  /**
   * React ref object (`RefObject`) holding the element that listens to pointer events; a ref whose
   * `.current` is `null` disables listening, while an omitted target falls back to `window`.
   *
   * @default window
   */
  target?: RefObject<EventTarget | null | undefined>
}
export interface UsePointerReturn extends UsePointerState {
  isInside: boolean
}
/**
 * Map from @vueuse/core `usePointer`
 * (`source/vueuse/packages/core/usePointer/`).
 *
 * @param options - `pointerTypes` / `initialValue` / `target` plus a custom
 *   `window` instance (`ConfigurableWindow`) used when `target` is omitted,
 *   e.g. an iframe window or a test double; listeners rebind when it changes.
 *
 * @example
 * const { x, y, pressure, pointerType, isInside } = usePointer()
 */
export declare function usePointer(
  options?: UsePointerOptions,
): UsePointerReturn
```
