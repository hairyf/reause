---
category: Sensors
---

# useElementByPoint

Reactive element by point

## Usage

```tsx
import { useElementByPoint, useMouse } from '@reause/core'

const { x, y } = useMouse({ type: 'client' })
const { element } = useElementByPoint({ x, y })
```

## Source Forms

`x` and `y` are read-only value sources and take plain numbers (upstream:
`MaybeRefOrGetter<number>`). Resolve a React ref or state value at the call site; `multiple` stays a
plain value / React ref (a behavior toggle):

```tsx
const { x, y } = useMouse({ type: 'client' })

const { element } = useElementByPoint({ x, y }) // read on every scheduler tick
const { element: refElement } = useElementByPoint({ x: xRef.current, y: yRef.current })
```

## Type Declarations

```ts
export interface UseElementByPointOptions<Multiple extends boolean = false> {
  /**
   * X coordinate of the point to hit-test. A read-only value source — pass a plain number; resolve
   * a React ref or getter at the call site. The latest value is read on every scheduler tick.
   */
  x: number
  /**
   * Y coordinate of the point to hit-test. A read-only value source — pass a plain number; resolve
   * a React ref or getter at the call site. The latest value is read on every scheduler tick.
   */
  y: number
  /**
   * When enabled, return every element under the point (`document.elementsFromPoint`) instead of
   * the topmost one (`document.elementFromPoint`)
   *
   * @default false
   */
  multiple?: Multiple
  /**
   * Allow a custom `document` instance, e.g. working with iframes or in testing environments.
   *
   * @default the global `document` on the client, `undefined` during SSR
   */
  document?: Document
  /**
   * Custom scheduler driving the element updates. Called during render, so it must follow the Rules
   * of Hooks — pass it consistently across renders, e.g. `scheduler: cb => useRafFn(cb, { fpsLimit:
   * 30 })`.
   *
   * @default useRafFn
   */
  scheduler?: (cb: () => void) => Pausable
}
export interface UseElementByPointReturn<Multiple extends boolean = false> {
  /**
   * Whether `elementFromPoint` (or `elementsFromPoint` when `multiple` is enabled) is available in
   * the current browser. `false` during render and on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * The element at the given point. `null` before the first tick (and when the point hits nothing).
   */
  element: Multiple extends true ? HTMLElement[] : HTMLElement | null
  /**
   * Whether the scheduler loop is currently active
   */
  isActive: boolean
  /**
   * Pause the element update loop
   */
  pause: () => void
  /**
   * Resume the element update loop
   */
  resume: () => void
}
/**
 * Map from @vueuse/core `useElementByPoint`
 * (`source/vueuse/packages/core/useElementByPoint/`).
 *
 * @see https://vueuse.org/core/useElementByPoint/
 * @param options - UseElementByPointOptions
 *
 * @example
 * const { x, y } = useMouse({ type: 'client' })
 * const { element } = useElementByPoint({ x, y })
 */
export declare function useElementByPoint<M extends boolean = false>(
  options: UseElementByPointOptions<M>,
): UseElementByPointReturn<M>
```
