---
category: Browser
---

# useFullscreen

Reactive [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API). It adds methods to present a specific Element (and its descendants) in full-screen mode, and to exit full-screen mode once it is no longer needed. This makes it possible to present desired content—such as an online game—using the user's entire screen, removing all browser user interface elements and other applications from the screen until full-screen mode is shut off.

## Usage

```tsx
import { useFullscreen } from '@reause/core'

const { isFullscreen, enter, exit, toggle } = useFullscreen()
```

Fullscreen specified element. Some platforms (like iOS's Safari) only allow fullscreen on video elements.

```tsx
import { useFullscreen } from '@reause/core'
import { useRef } from 'react'

const el = useRef<HTMLVideoElement>(null)
const { isFullscreen, enter, exit, toggle } = useFullscreen(el)

// <video ref={el} controls />
```

## Type Declarations

```ts
/**
 * Element on which fullscreen is requested — a plain element (or `null` /
 * `undefined` while it is not available yet), a ref-like `{ current }` object
 * (e.g. the result of `useRef`) — the React equivalent of upstream's
 * `ElementRef`.
 */
export type FullscreenTarget = RefObject<
  HTMLElement | SVGElement | null | undefined
>
export interface UseFullscreenOptions {
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in
   * testing environments.
   *
   * @default typeof document !== 'undefined' ? document : undefined
   */
  document?: Document
  /**
   * Automatically exit fullscreen when the component is unmounted.
   *
   * @default false
   */
  autoExit?: boolean
}
export interface UseFullscreenReturn {
  /**
   * If the Fullscreen API is supported by the current browser.
   */
  isSupported: boolean
  /**
   * Whether the target element (or `document.documentElement` when no target
   * is given) is currently displayed in fullscreen mode.
   */
  isFullscreen: boolean
  /**
   * Request fullscreen on the target element.
   */
  enter: () => Promise<void>
  /**
   * Exit fullscreen mode.
   */
  exit: () => Promise<void>
  /**
   * Toggle between entering and exiting fullscreen mode.
   */
  toggle: () => Promise<void>
}
/**
 * Reactive Fullscreen API — React port of VueUse's `useFullscreen`.
 *
 * Map from @vueuse/core `useFullscreen`
 * (`source/vueuse/packages/core/useFullscreen/`). Adds methods to present a
 * specific element (and its descendants) in fullscreen mode, and to exit
 * fullscreen mode once it is no longer needed. The target defaults to
 * `document.documentElement`, and some platforms (like iOS Safari) only allow
 * fullscreen on video elements.
 *
 * React divergences:
 * - upstream returns `isSupported` (`computed`) and `isFullscreen`
 *   (`shallowRef`) as reactive refs; here they are plain boolean states —
 *   `isSupported` resolves in a mount effect (SSR renders `false`) and
 *   `isFullscreen` follows the `fullscreenchange` events and the `enter` /
 *   `exit` calls;
 * - the `enter` / `exit` / `toggle` functions are stable `useCallback`s that
 *   read the latest resolved element, `document` and method names from a ref
 *   the way upstream reads its refs at call time;
 * - the vendor-prefixed method detection re-resolves in an effect whenever
 *   the resolved target or the `document` option changes (upstream
 *   `computed`), and the fullscreenchange listeners re-bind when the resolved
 *   target changes (upstream `useEventListener(() => unrefElement(targetRef))`);
 * - `tryOnMounted(handlerCallback)` becomes the same effect adopting the
 *   browser's current fullscreen state after mount, and
 *   `tryOnScopeDispose(exit)` with `autoExit` becomes an unmount cleanup (the
 *   option is read once at mount, as upstream destructures it at setup);
 * - rendering never touches the DOM: the target is read from its ref's
 *   `.current` and the global `document` is only read through
 *   a guarded `typeof document === 'undefined'` check, so server rendering is
 *   safe and the state keeps its defaults until the mount effect;
 * - the component variant (`UseFullscreen` render-slot component) is not
 *   ported — React uses the hook directly.
 *
 * @example
 * const el = useRef<HTMLVideoElement>(null)
 * const { isFullscreen, enter, exit, toggle } = useFullscreen(el)
 */
export declare function useFullscreen(
  target?: FullscreenTarget,
  options?: UseFullscreenOptions,
): UseFullscreenReturn
```
