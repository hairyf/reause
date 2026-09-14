---
category: Elements
---

# useElementVisibility

Tracks the visibility of an element within the viewport.

## Usage

```tsx
import { useElementVisibility } from '@reause/core'
import { useRef } from 'react'

const target = useRef<HTMLDivElement | null>(null)
const targetIsVisible = useElementVisibility(target)
```

```tsx
const target2 = useRef<HTMLDivElement | null>(null)
const target2IsVisible = useElementVisibility(target2, {
  threshold: 1.0, // 100% visible
})
```

### rootMargin

If you wish to trigger your callback sooner before the element is fully visible, you can use
the `rootMargin` option (See [MDN IntersectionObserver/rootMargin](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/rootMargin)).

```ts
const targetIsVisible = useElementVisibility(target, {
  rootMargin: '0px 0px 100px 0px',
})
```

### threshold

If you want to control the percentage of the visibility required to update the value, you can use the `threshold` option (See [MDN IntersectionObserver/threshold](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver#threshold)).

```ts
const targetIsVisible = useElementVisibility(target, {
  threshold: 1.0, // 100% visible
})
```

## Type Declarations

```ts
/**
 * Options for `useElementVisibility`. Mirrors upstream's
 * `UseElementVisibilityOptions` minus `controls` — the React port returns a
 * plain `boolean`, so there is no control object to expose.
 */
export interface UseElementVisibilityOptions extends ConfigurableWindow {
  /**
   * Initial value.
   *
   * @default false
   */
  initialValue?: boolean
  /**
   * The element that is used as the viewport for checking visibility of the target.
   */
  scrollTarget?: ElementTarget | RefObject<Document | null>
  /**
   * Either a single number or an array of numbers between 0.0 and 1.
   *
   * @default 0
   */
  threshold?: number | number[]
  /**
   * A string which specifies a set of offsets to add to the root's bounding_box when calculating intersections.
   */
  rootMargin?: string
  /**
   * Stop tracking when element visibility changes for the first time.
   *
   * @default false
   */
  once?: boolean
}
/**
 * Tracks the visibility of an element within the viewport.
 *
 * Map from @vueuse/core `useElementVisibility`
 * (`source/vueuse/packages/core/useElementVisibility/`), which observes the
 * target with an `IntersectionObserver` rooted at the viewport (or a custom
 * `scrollTarget`) and maps the latest entry's `isIntersecting` onto a reactive
 * boolean.
 *
 * React divergences:
 * - upstream returns a `ShallowRef<boolean>`, or — with `controls: true` —
 *   that ref bundled with the underlying observer controls; the React port
 *   returns a plain `boolean` state and drops the `controls` variant (the
 *   underlying observer's Pausable members are reachable directly through
 *   this repo's `useIntersectionObserver`);
 * - the observation re-uses `useIntersectionObserver`, so target/root/root
 *   margin re-resolution and observer teardown follow that hook; the callback
 *   picks the latest `isIntersecting` across the delivered entries by `time`
 *   (upstream loop preserved 1:1);
 * - when `IntersectionObserver` is unavailable (SSR, older browsers) the hook
 *   falls back to `scroll`/`resize` listeners that recompute the intersection
 *   of the target and viewport (or `scrollTarget`) bounding boxes, honoring
 *   `rootMargin` and `threshold`; the fallback activates from
 *   `useIntersectionObserver`'s `isSupported` state;
 * - `once` stops tracking after the first visibility change by calling the
 *   active `stop` (observer disconnect or listener removal);
 * - an explicit `window: null` disables observation entirely, mirroring
 *   upstream's `window && 'IntersectionObserver' in window` support gate —
 *   the null is forwarded to `useIntersectionObserver` (supported = false) and
 *   the fallback has no window to listen on;
 * - SSR-safe: the resolved `window` is read through `typeof` guards and the
 *   fallback listeners attach only in effects, so nothing touches `window`
 *   during render.
 *
 * @example
 * const target = useRef<HTMLDivElement | null>(null)
 * const targetIsVisible = useElementVisibility(target)
 *
 * return <div ref={target}>{targetIsVisible ? 'inside' : 'outside'}</div>
 */
export declare function useElementVisibility(
  element: ElementTarget,
  options?: UseElementVisibilityOptions,
): boolean
```
