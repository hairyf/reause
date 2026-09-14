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
   * Add event listeners with the `capture` option set to `true`
   * (see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#capture))
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
 * React port of VueUse's `useMousePressed`.
 *
 * Map from @vueuse/core `useMousePressed`
 * (`source/vueuse/packages/core/useMousePressed/`), which tracks a reactive
 * pressing state — `pressed` flips on `mousedown`/`touchstart` (optionally
 * `dragstart`) on the `target` option (default `window`) and back off on
 * `mouseup`/`mouseleave`/`touchend`/`touchcancel` (optionally `drop`/
 * `dragend`) on `window`, recording the `sourceType` of the press.
 *
 * React divergences:
 *
 * - the Vue `pressed`/`sourceType` shallow refs become plain values in a
 *   `{ pressed, sourceType }` object backed by React state;
 * - upstream's `useEventListener` becomes a self-contained mount `useEffect`
 *   that re-subscribes when `target`/`capture`/`drag`/`touch` change and
 *   removes all listeners on unmount;
 * - `onPressed`/`onReleased` are read through a latest-value ref, so the
 *   listeners always call the newest callbacks without re-binding on renders;
 * - `target` accepts an element or a ref-like `{ current }` object
 *   (React equivalent of `MaybeRefOrGetter`). It is re-resolved on every
 *   render and the listeners re-bind when the resolved element changes;
 * - SSR-safe: nothing touches `window` during render — the listeners attach
 *   in the mount effect only, and `initialValue` seeds `useState` so SSR
 *   renders the same initial state.
 *
 * @example
 * const { pressed, sourceType } = useMousePressed()
 */
export declare function useMousePressed(
  options?: UseMousePressedOptions,
): UseMousePressedReturn
```
