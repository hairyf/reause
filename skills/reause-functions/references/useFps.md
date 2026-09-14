---
category: Sensors
---

# useFps

Reactive FPS (frames per second)

## Usage

```tsx
import { useFps } from '@reause/core'

const fps = useFps()
// 60

const fpsEvery2 = useFps({ every: 2 }) // measure over every 2 frames
```

## Type Declarations

```ts
export interface UseFpsOptions {
  /**
   * Calculate the FPS on every x frames.
   *
   * @default 10
   */
  every?: number
}
/**
 * Map from @vueuse/core `useFps`
 * (`source/vueuse/packages/core/useFps/`).
 *
 * @example
 * const fps = useFps()
 */
export declare function useFps(options?: UseFpsOptions): number
```
