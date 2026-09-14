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
 * Element on which fullscreen is requested — a React ref object (`RefObject`) holding the element
 * (or `null` / `undefined` while it is not available yet).
 */
export type FullscreenTarget = RefObject<
  HTMLElement | SVGElement | null | undefined
>
export interface UseFullscreenOptions {
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
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
   * Whether the target element (or `document.documentElement` when no target is given) is currently
   * displayed in fullscreen mode.
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
 * Map from @vueuse/core `useFullscreen`
 * (`source/vueuse/packages/core/useFullscreen/`).
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
