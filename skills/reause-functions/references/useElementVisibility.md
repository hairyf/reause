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
 * Options for `useElementVisibility`., so there is no control object to expose.
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
   * A string which specifies a set of offsets to add to the root's bounding_box when calculating
   * intersections.
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
 * Map from @vueuse/core `useElementVisibility`
 * (`source/vueuse/packages/core/useElementVisibility/`).
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
