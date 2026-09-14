---
category: Browser
---

# useMemory

Reactive Memory Info

## Usage

```tsx
import { useMemory } from '@reause/core'

const { isSupported, memory } = useMemory()
```

## Type Declarations

```ts
/**
 * Performance.memory
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory
 */
export interface MemoryInfo {
  /**
   * The maximum size of the heap, in bytes, that is available to the context.
   */
  readonly jsHeapSizeLimit: number
  /**
   * The total allocated heap size, in bytes.
   */
  readonly totalJSHeapSize: number
  /**
   * The currently active segment of JS heap, in bytes.
   */
  readonly usedJSHeapSize: number
  [Symbol.toStringTag]: "MemoryInfo"
}
/**
 * Pausable controls a scheduler reports back — see `useTimeoutPoll` for the canonical core type.
 */
export interface UseMemoryOptions {
  /**
   * Custom scheduler driving the periodic memory reads.
   *
   * Called during render, so it must follow the Rules of Hooks — pass it consistently across
   * renders, e.g. `scheduler: cb => useIntervalFn(cb, 500)` with `useIntervalFn` from
   * `@reause/shared`.
   *
   * The returned `Pausable` is paused while `performance.memory` is unavailable and resumed once it
   * is detected, so `pause` / `resume` must actually control the loop.
   *
   * @default useIntervalFn (1000 ms)
   */
  scheduler?: (cb: () => void) => Pausable
}
export interface UseMemoryReturn {
  /**
   * Whether the `performance.memory` API is available in the current environment. `false` during
   * render and on the server, resolved in a mount effect.
   */
  isSupported: boolean
  /**
   * The current heap memory info, `undefined` when unsupported (and before the first read).
   */
  memory: MemoryInfo | undefined
}
/**
 * Map from @vueuse/core `useMemory`
 * (`source/vueuse/packages/core/useMemory/`).
 *
 * @see https://vueuse.org/core/useMemory/
 * @param options
 *
 * @example
 * const { isSupported, memory } = useMemory()
 */
export declare function useMemory(options?: UseMemoryOptions): UseMemoryReturn
```
