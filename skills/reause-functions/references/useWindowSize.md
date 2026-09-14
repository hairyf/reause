---
category: Elements
---

# useWindowSize

Reactive window size

## Usage

```tsx
import { useWindowSize } from '@reause/core'

const { width, height } = useWindowSize() // plain numbers, re-render on resize
// SSR renders the Infinity defaults; after mount it tracks the real window size
```

## Type Declarations

```ts
export interface UseWindowSizeOptions extends ConfigurableWindow {
  initialWidth?: number
  initialHeight?: number
  /**
   * Listen to the `orientation: portrait` media-query change (upstream's stand-in for the
   * `orientationchange` event).
   *
   * @default true
   */
  listenOrientation?: boolean
  /**
   * Whether the scrollbar should be included in the width and height. Only effective when `type` is
   * `'inner'`.
   *
   * @default true
   */
  includeScrollbar?: boolean
  /**
   * Use `window.innerWidth` or `window.outerWidth` or `window.visualViewport`.
   *
   * @default 'inner'
   */
  type?: "inner" | "outer" | "visual"
}
export interface UseWindowSizeReturn {
  width: number
  height: number
}
/**
 * Map from @vueuse/core `useWindowSize`
 * (`source/vueuse/packages/core/useWindowSize/`).
 *
 * @example
 * const { width, height } = useWindowSize()
 */
export declare function useWindowSize(
  options?: UseWindowSizeOptions,
): UseWindowSizeReturn
```
