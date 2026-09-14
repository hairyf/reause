---
category: Sensors
---

# useFocusWithin

Reactive utility to track if an element or one of its descendants has focus. It is meant to match the behavior of the `:focus-within` CSS pseudo-class. A common use case would be on a form element to see if any of its inputs currently have focus.

## Basic Usage

```tsx
import { useFocusWithin } from '@reause/core'
import { useRef } from 'react'

const target = useRef<HTMLFormElement>(null)
const { focused } = useFocusWithin(target)

// `focused` is true while the form or any input inside it has focus
```

## Type Declarations

```ts
export interface UseFocusWithinReturn {
  /**
   * True if the element or any of its descendants are focused
   */
  focused: boolean
}
/**
 * Map from @vueuse/core `useFocusWithin`
 * (`source/vueuse/packages/core/useFocusWithin/`).
 *
 * @param target - React ref object (`RefObject`) holding the element to
 *   track focus within, resolved with the shared `unrefElement`
 * @param options - a custom `window` instance, e.g. working with iframes or
 *   in testing environments
 *
 * @example
 * const target = useRef<HTMLFormElement>(null)
 * const { focused } = useFocusWithin(target)
 * // `focused` is true while the form or any input inside it has focus
 */
export declare function useFocusWithin(
  target: ElementTarget,
  options?: ConfigurableWindow,
): UseFocusWithinReturn
```
