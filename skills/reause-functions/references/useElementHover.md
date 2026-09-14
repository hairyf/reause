---
category: Sensors
---

# useElementHover

Reactive element's hover state

## Usage

```tsx
import { useElementHover } from '@reause/core'
import { useRef } from 'react'

const myHoverableElement = useRef<HTMLButtonElement>(null)
const isHovered = useElementHover(myHoverableElement)
```

```tsx
<button ref={myHoverableElement}>
  {isHovered ? 'Thank you!' : 'Hover me'}
</button>
```

You can also provide hover options:

```tsx
import { useElementHover } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLButtonElement>(null)
const isHovered = useElementHover(el, { delayEnter: 200, delayLeave: 600 })

// leave detection is also supported on elements being removed from the DOM
const isHoveredWithRemoval = useElementHover(el, { triggerOnRemoval: true })
```

## Type Declarations

```ts
export interface UseElementHoverOptions extends ConfigurableWindow {
  /**
   * Delay in milliseconds before the hover state is set to `true`
   *
   * @default 0
   */
  delayEnter?: number
  /**
   * Delay in milliseconds before the hover state is set to `false`
   *
   * @default 0
   */
  delayLeave?: number
  /**
   * Whether to set the hover state to `false` when the element is removed
   * from the DOM
   *
   * @default false
   */
  triggerOnRemoval?: boolean
}
/**
 * Reactive element's hover state.
 *
 * Map from @vueuse/core `useElementHover`
 * (`source/vueuse/packages/core/useElementHover/`), which attaches
 * `mouseenter` / `mouseleave` listeners to the target element and reports
 * whether the pointer currently hovers it. `delayEnter` / `delayLeave` defer
 * the state flip with a debounced timer (a new event cancels any pending
 * one), and `triggerOnRemoval` forces the state back to `false` when the
 * element is removed from the DOM.
 *
 * React divergences:
 * - upstream's `ShallowRef<boolean>` return becomes a plain boolean backed by
 *   React state, so the hook reads as `const isHovered = useElementHover(el)`;
 * - `target` accepts an element or a ref-like `{ current }` object
 *   (the React analog of upstream's `MaybeRefOrGetter`), re-resolved on every
 *   render and re-bound whenever the resolved element changes, so a `useRef`
 *   target that is `null` during the first render still starts tracking once
 *   React attaches the element;
 * - the upstream `useEventListener` composition is inlined in a mount
 *   `useEffect`, and the `triggerOnRemoval` `onElementRemoval` watcher is
 *   inlined as a `MutationObserver` on `document`; listeners and the observer
 *   are removed on unmount and any pending delay timer is cleared;
 * - all options are read live, uniformly: `delayEnter` / `delayLeave` are
 *   re-read on every event through latest-value refs, and `triggerOnRemoval`
 *   re-binds the removal observer when it changes — upstream freezes all
 *   three during setup (an intentional divergence, kept consistent across
 *   the options);
 * - `window: null` disables tracking entirely (no listeners, the state stays
 *   `false`), matching upstream's `if (!window) return`; an omitted `window`
 *   falls back to the global `window` only on the client;
 * - SSR-safe: nothing touches `window` or the DOM during render — listeners
 *   attach in the mount effect only and the initial state is always `false`.
 *
 * @param target - element or ref-like `{ current }` object resolving
 *   to the element whose hover state is tracked
 * @param options - `delayEnter` / `delayLeave` (default `0`),
 *   `triggerOnRemoval` (default `false`) and a custom `window` instance
 *   (`null` disables tracking)
 *
 * @example
 * const el = useRef<HTMLButtonElement>(null)
 * const isHovered = useElementHover(el, { delayEnter: 200, delayLeave: 600 })
 */
export declare function useElementHover(
  target: RefObject<EventTarget | null | undefined>,
  options?: UseElementHoverOptions,
): boolean
```
