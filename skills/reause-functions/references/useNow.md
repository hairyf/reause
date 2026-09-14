---
category: Animation
---

# useNow

Reactive current Date instance.

## Usage

```tsx
import { useNow } from '@reause/core'

const now = useNow()
```

```tsx
import { useNow } from '@reause/core'
// ---cut---
const { now, pause, resume } = useNow({ controls: true })
```

## Type Declarations

```ts
export interface UseNowOptions<Controls extends boolean> {
  /**
   * Expose more controls
   *
   * @default false
   */
  controls?: Controls
  /**
   * Custom scheduler to use for interval execution.
   *
   * Called during render, so it must follow the Rules of Hooks — pass it consistently across
   * renders, e.g. `scheduler: cb => useIntervalFn(cb, 500)` with `useIntervalFn` from
   * `@reause/shared`.
   *
   * @default useRafFn
   */
  scheduler?: (cb: () => void) => Pausable
}
export type UseNowReturn<Controls extends boolean> = Controls extends true
  ? {
      now: Date
    } & Pausable
  : Date
/**
 * Map from @vueuse/core `useNow`
 * (`source/vueuse/packages/core/useNow/`).
 *
 * @see https://vueuse.org/useNow/
 * @param options - UseNowOptions
 *
 * @example
 * const now = useNow()
 */
export declare function useNow(options?: UseNowOptions<false>): Date
export declare function useNow(options: UseNowOptions<true>): {
  now: Date
} & Pausable
```
