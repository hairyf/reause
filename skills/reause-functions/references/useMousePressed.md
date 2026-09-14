---
category: Sensors
---

# useMousePressed

Reactive mouse pressing state

## Basic Usage

```tsx
import { useMousePressed } from '@reause/core'

const { pressed, sourceType } = useMousePressed()

// only detect mouse changes
const mouse = useMousePressed({ touch: false })

// only capture presses on a specific element (accepts an element or a React ref)
const el = useRef<HTMLDivElement>(null)
const { pressed } = useMousePressed({ target: el })

// initialValue accepts State<boolean>, including a controllable tuple
const [pressedState, setPressedState] = useState(false)
const controlled = useMousePressed({ initialValue: [pressedState, setPressedState] })
```

## Type Declarations

```ts
export interface UseMousePressedOptions extends ConfigurableWindow {
  /**
   * Listen to `touchstart` `touchend` events
   *
   * @default true
   */
  touch?: boolean
  /**
   * Listen to `dragstart` `drop` and `dragend` events
   *
   * @default true
   */
  drag?: boolean
  /**
   * Add event listeners with the `capture` option set to `true` (see
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#capture))
   *
   * @default false
   */
  capture?: boolean
  /**
   * Initial values
   *
   * @default false
   */
  initialValue?: State<boolean>
  /**
   * Element target to be capture the click
   */
  target?: RefObject<EventTarget | null | undefined>
  /**
   * Callback to be called when the mouse is pressed
   *
   * @param event
   */
  onPressed?: (event: MouseEvent | TouchEvent | DragEvent) => void
  /**
   * Callback to be called when the mouse is released
   *
   * @param event
   */
  onReleased?: (event: MouseEvent | TouchEvent | DragEvent) => void
}
/** @deprecated use {@link UseMousePressedOptions} instead */
export type MousePressedOptions = UseMousePressedOptions
export interface UseMousePressedReturn {
  pressed: boolean
  sourceType: UseMouseSourceType
}
/**
 * Map from @vueuse/core `useMousePressed`
 * (`source/vueuse/packages/core/useMousePressed/`).
 *
 * @example
 * const { pressed, sourceType } = useMousePressed()
 */
export declare function useMousePressed(
  options?: UseMousePressedOptions,
): UseMousePressedReturn
```
