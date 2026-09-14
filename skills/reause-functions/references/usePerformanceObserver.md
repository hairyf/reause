---
category: Browser
---

# usePerformanceObserver

Observe performance metrics

## Usage

```tsx
import { usePerformanceObserver } from '@reause/core'
import { useState } from 'react'

const [entrys, setEntrys] = useState<PerformanceEntry[]>([])
const { isSupported, start, stop } = usePerformanceObserver(
  { entryTypes: ['paint'] },
  list => setEntrys(list.getEntries()),
)
// starts automatically (immediate: true by default) — stop() disconnects
```

## Type Declarations

```ts
export type UsePerformanceObserverOptions = PerformanceObserverInit & {
  /**
   * Specify a custom `window` instance, e.g. working with iframes or in testing environments.
   */
  window?: Window
  /**
   * Start the observer immediate.
   *
   * @default true
   */
  immediate?: boolean
}
/**
 * Map from @vueuse/core `usePerformanceObserver`
 * (`source/vueuse/packages/core/usePerformanceObserver/`).
 *
 * @example
 * const [entrys, setEntrys] = useState<PerformanceEntry[]>([])
 * const { isSupported, start, stop } = usePerformanceObserver(
 *   { entryTypes: ['paint'] },
 *   list => setEntrys(list.getEntries()),
 * )
 */
export declare function usePerformanceObserver(
  options: UsePerformanceObserverOptions,
  callback: PerformanceObserverCallback,
): {
  isSupported: boolean
  start: () => void
  stop: () => void
}
```
