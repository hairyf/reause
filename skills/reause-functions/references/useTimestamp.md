---
category: Animation
---

# useTimestamp

Reactive current timestamp (`Date.now() + offset`), updating on every animation frame

## Usage

```tsx
import { useTimestamp } from '@reause/core'

const timestamp = useTimestamp({ offset: 0 })
```

```tsx
import { useTimestamp } from '@reause/core'
// ---cut---
const { timestamp, pause, resume } = useTimestamp({ controls: true })
```

## Type Declarations

```ts
export interface UseTimestampOptions<Controls extends boolean> {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls
  /**
   * Offset value adding to the value
   *
   * @default 0
   */
  offset?: number
  /**
   * Callback on each update
   */
  callback?: (timestamp: number) => void
}
export interface UseTimestampControls {
  timestamp: number
  isActive: boolean
  pause: () => void
  resume: () => void
}
export type UseTimestampReturn<Controls extends boolean> = Controls extends true
  ? UseTimestampControls
  : number
/**
 * Map from @vueuse/core `useTimestamp`
 * (`source/vueuse/packages/core/useTimestamp/`).
 *
 * @example
 * const timestamp = useTimestamp({ offset: 0 })
 */
export declare function useTimestamp(
  options?: UseTimestampOptions<false>,
): number
export declare function useTimestamp(
  options: UseTimestampOptions<true>,
): UseTimestampControls
```
