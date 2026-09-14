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
 * Options for `useElementOverflow`: `observeMutation` optionally turns on a
 * `MutationObserver` (with a custom `MutationObserverInit`), `onUpdated` is
 * called whenever an observer fires, and `window` allows a custom `window`
 * instance, e.g. working with iframes or in testing environments.
 */
export interface UseElementOverflowOptions extends ConfigurableWindow {
  /**
   * Use MutationObserver to observe the target and its children. Captured once
   * on mount — later changes are ignored (upstream destructures it once at
   * setup too).
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
 * Return of `useElementOverflow`. Upstream exposes `shallowReadonly` refs for
 * the overflow flags; the React port exposes plain `boolean` state. `stop` and
 * `update` match the upstream member structure.
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
   * Stop observing. Disconnects the observers; the hook does not restart after
   * `stop()`.
   */
  stop: () => void
  /**
   * Re-check the overflow state immediately.
   */
  update: () => void
}
/**
 * Reactive element's overflow state — React port of VueUse's
 * `useElementOverflow`.
 *
 * Map from @vueuse/core `useElementOverflow`
 * (`source/vueuse/packages/core/useElementOverflow/`). Tracks whether an
 * element's content overflows its box in the x/y directions by comparing
 * `scrollWidth`/`scrollHeight` against `offsetWidth`/`offsetHeight` whenever
 * the element or its children resize (upstream: `useResizeObserver`) and,
 * with `observeMutation`, whenever its DOM content mutates (upstream:
 * `useMutationObserver`).
 *
 * React divergences:
 * - the Vue `shallowRef`/`shallowReadonly` overflow flags become plain
 *   `boolean` state read off the returned object; `stop`/`update` keep the
 *   upstream member structure;
 * - `target` accepts an element or a React ref object (`{ current }`) —
 *   the React analog of upstream's
 *   `ElementTarget`. SVG elements are ignored;
 * - upstream's `useResizeObserver`/`useMutationObserver` composition becomes a
 *   self-contained observer effect that re-resolves the target plus its
 *   `HTMLElement` children after every render and reconciles the observers —
 *   the `ResizeObserver` is rebuilt only when the resolved element set or the
 *   `window` option changed (unchanged renders never disconnect a live
 *   observer, so pending deliveries are not dropped), while `observeMutation`
 *   is captured once at mount — upstream destructures it once at setup, so
 *   later changes (boolean flips or swapped init objects) are ignored and
 *   `stop()` is the way to halt observation;
 * - the Vue component/directive variants (`UseElementOverflow`,
 *   `vElementOverflow`) are not ported — they have no React equivalents;
 * - SSR-safe: nothing touches `window` during render, and `update()` no-ops
 *   without an element or a window.
 *
 * @param target - element or React ref object (`{ current }`) returning
 *   the element to watch for overflow
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
