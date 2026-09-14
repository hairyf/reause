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
   * Element that listens to pointer events; an explicit `null` disables
   * listening, while an omitted target falls back to `window`.
   *
   * @default window
   */
  target?: RefObject<EventTarget | null | undefined>
}
export interface UsePointerReturn extends UsePointerState {
  isInside: boolean
}
/**
 * React port of VueUse's `usePointer`.
 *
 * Map from @vueuse/core `usePointer`
 * (`source/vueuse/packages/core/usePointer/`), which listens to
 * `pointerdown`/`pointermove`/`pointerup` on the `target` option (default
 * `window`), picks the pointer state from every event, and flips `isInside`
 * back to `false` on `pointerleave`/`pointercancel`. A `pointerTypes` filter
 * skips the state update but still marks `isInside`. Reactive pointer state.
 *
 * React divergences:
 * - the Vue refs returned by upstream become a plain object of plain values —
 *   read `x`, `y`, `pressure`, `pointerType`, ... directly off the result;
 * - upstream's `useEventListener` becomes a self-contained mount `useEffect`
 *   that re-subscribes when the resolved `target`/`pointerTypes` change and
 *   removes all listeners on unmount;
 * - `initialValue` is folded into the `useState` initializer, so SSR renders
 *   the defaults (`x: 0`, `y: 0`, ..., `pointerType: null`, `isInside: false`)
 *   without touching `window`;
 * - `target` accepts a plain `EventTarget` or a ref-like `{ current }` object
 *   (`MaybeRefOrGetter`) and an explicit `null` disables listening, while an omitted
 *   `target` falls back to the `window` option (upstream `target = defaultWindow`
 *   plus `if (target)`).
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
