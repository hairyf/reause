---
category: Sensors
---

# useMouse

Reactive mouse position

## Basic Usage

```tsx
import { useMouse } from '@reause/core'

const { x, y, sourceType } = useMouse()
```

Touch is enabled by default. To only detect mouse changes, set `touch` to `false`.
The `dragover` event is used to track mouse position while dragging.

```tsx
const { x, y } = useMouse({ touch: false })
```

## Custom Extractor

It's also possible to provide a custom extractor function to get the position from the event.

```tsx
import type { UseMouseEventExtractor } from '@reause/core'
import { useMouse } from '@reause/core'
import { useRef } from 'react'

const parentRef = useRef<HTMLDivElement>(null)

const extractor: UseMouseEventExtractor = event => (
  event instanceof MouseEvent
    ? [event.offsetX, event.offsetY]
    : null
)

const { x, y, sourceType } = useMouse({ target: parentRef, type: extractor })
```

## Type Declarations

```ts
export type UseMouseCoordType = "page" | "client" | "screen" | "movement"
export type UseMouseSourceType = "mouse" | "touch" | null
export type UseMouseEventExtractor = (
  event: MouseEvent | Touch,
) => [x: number, y: number] | null | undefined
interface Position {
  x: number
  y: number
}
export interface UseMouseOptions extends ConfigurableWindow {
  /**
   * Mouse position based by page, client, screen, or relative to previous position
   *
   * @default 'page'
   */
  type?: UseMouseCoordType | UseMouseEventExtractor
  /**
   * Listen events on `target` element
   *
   * @default 'Window'
   */
  target?: RefObject<Window | EventTarget | null | undefined>
  /**
   * Listen to `touchmove` events
   *
   * @default true
   */
  touch?: boolean
  /**
   * Listen to `scroll` events on window, only effective on type `page`
   *
   * @default true
   */
  scroll?: boolean
  /**
   * Reset to initial value when `touchend` event fired
   *
   * @default false
   */
  resetOnTouchEnds?: boolean
  /**
   * Initial values
   */
  initialValue?: Position
  /**
   * Filter for if events should to be received.
   */
  eventFilter?: EventFilter
}
export interface UseMouseReturn {
  x: number
  y: number
  sourceType: UseMouseSourceType
}
/**
 * Map from @vueuse/core `useMouse`
 * (`source/vueuse/packages/core/useMouse/`).
 *
 * @example
 * const { x, y, sourceType } = useMouse()
 */
export declare function useMouse(options?: UseMouseOptions): UseMouseReturn
```
