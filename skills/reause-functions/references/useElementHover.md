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
   * Whether to set the hover state to `false` when the element is removed from the DOM
   *
   * @default false
   */
  triggerOnRemoval?: boolean
}
/**
 * Map from @vueuse/core `useElementHover`
 * (`source/vueuse/packages/core/useElementHover/`).
 *
 * @param target - React ref object (`RefObject`) holding the element whose
 *   hover state is tracked, resolved with the shared `unrefElement`
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
