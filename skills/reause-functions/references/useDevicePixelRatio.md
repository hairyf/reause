---
category: Sensors
---

# useDevicePixelRatio

Reactively track [`window.devicePixelRatio`](https://developer.mozilla.org/docs/Web/API/Window/devicePixelRatio)

> NOTE: there is no event listener for `window.devicePixelRatio` change. So this function uses [`Testing media queries programmatically (window.matchMedia)`](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Testing_media_queries) applying the same mechanism as described in [this example](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#monitoring_screen_resolution_or_zoom_level_changes).

## Usage

```tsx
import { useDevicePixelRatio } from '@reause/core'

const { pixelRatio } = useDevicePixelRatio()

console.log(pixelRatio)
```

## Type Declarations

```ts
export interface UseDevicePixelRatioOptions extends ConfigurableWindow {}
export interface UseDevicePixelRatioReturn {
  pixelRatio: number
  /**
   * Stop tracking: removes the current `matchMedia` change listener and prevents any future
   * re-subscription (upstream's `WatchStopHandle`).
   */
  stop: () => void
}
/**
 * Map from @vueuse/core `useDevicePixelRatio`
 * (`source/vueuse/packages/core/useDevicePixelRatio/`).
 *
 * @example
 * const { pixelRatio } = useDevicePixelRatio()
 */
export declare function useDevicePixelRatio(
  options?: UseDevicePixelRatioOptions,
): UseDevicePixelRatioReturn
```
