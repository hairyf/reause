---
category: Elements
---

# useElementOverflow

Reactive element's overflow state

## Usage

```tsx
import { useElementOverflow } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLDivElement | null>(null)
const { isXOverflowed } = useElementOverflow(el, { observeMutation: true })

// <div ref={el} style={{ width: 100, overflow: 'hidden' }}>
//   {isXOverflowed ? <button>show more</button> : <span>some words may be too long to show here</span>}
// </div>
```

## Type Declarations

```ts
/**
 * Options for `useElementOverflow`: `observeMutation` optionally turns on a `MutationObserver`
 * (with a custom `MutationObserverInit`), `onUpdated` is called whenever an observer fires, and
 * `window` allows a custom `window` instance, e.g. working with iframes or in testing environments.
 */
export interface UseElementOverflowOptions extends ConfigurableWindow {
  /**
   * Use MutationObserver to observe the target and its children. Captured once on mount — later
   * changes are ignored (upstream destructures it once at setup too).
   *
   * @default false
   */
  observeMutation?: boolean | MutationObserverInit
  /**
   * Callback when observer triggered.
   */
  onUpdated?: ResizeObserverCallback | MutationCallback
}
/**
 * Return of `useElementOverflow`. Upstream exposes `shallowReadonly` refs for the overflow flags;
 * the React port exposes plain `boolean` state. `stop` and `update` match the upstream member
 * structure.
 */
export interface UseElementOverflowReturn {
  /**
   * Whether the element's content overflows in the horizontal direction.
   */
  isXOverflowed: boolean
  /**
   * Whether the element's content overflows in the vertical direction.
   */
  isYOverflowed: boolean
  /**
   * Stop observing. Disconnects the observers; the hook does not restart after `stop()`.
   */
  stop: () => void
  /**
   * Re-check the overflow state immediately.
   */
  update: () => void
}
/**
 * Map from @vueuse/core `useElementOverflow`
 * (`source/vueuse/packages/core/useElementOverflow/`).
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   watch for overflow, resolved with the shared `unrefElement`
 * @param option - `observeMutation` (default `false`, or a
 *   `MutationObserverInit` object) and `onUpdated`, plus a custom `window`
 *   instance
 * @example
 * const el = useRef<HTMLDivElement | null>(null)
 * const { isXOverflowed } = useElementOverflow(el)
 */
export declare function useElementOverflow(
  target: RefObject<Element | null | undefined>,
  option?: UseElementOverflowOptions,
): UseElementOverflowReturn
```
