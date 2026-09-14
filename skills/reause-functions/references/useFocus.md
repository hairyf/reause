---
category: Sensors
---

# useFocus

Reactive utility to track or set the focus state of a DOM element

## Basic Usage

```tsx
import { useFocus } from '@reause/core'
import { useRef } from 'react'

const input = useRef<HTMLInputElement>(null)
const [isFocused, setFocused] = useFocus(input)
```

State changes to reflect whether the target element is the focused element. Setting the reactive
state from the outside with `setFocused(true)` / `setFocused(false)` will trigger `focus` and `blur`
events for `true` and `false` values respectively.

## Setting initial focus

To focus the element on its first render one can provide the `initialValue` option as `true`. This
will trigger a `focus` event on the target element.

```tsx
const [isFocused] = useFocus(input, { initialValue: true })
```

## Change focus state

Changes of the `isFocused` state via `setFocused` will automatically trigger `focus` and `blur`
events for `true` and `false` values respectively. You can utilize this behavior to focus the target
element as a result of another action (e.g. when a button click as shown below).

```tsx
import { useFocus } from '@reause/core'
import { useRef } from 'react'

function Component() {
  const input = useRef<HTMLInputElement>(null)
  const [isFocused, setFocused] = useFocus(input)

  return (
    <div>
      <button type="button" onClick={() => setFocused(true)}>
        Click me to focus input below
      </button>
      <input ref={input} type="text" />
    </div>
  )
}
```

## Return Values

Returns a readonly tuple (React array destructuring, not a Vue-style ref object):

```ts
const [isFocused, setFocused] = useFocus(input)
```

| Element      | Type                                | Description                                                                                                                                                                                                                                                                              |
| ------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isFocused`  | `boolean`                           | Whether the target element has focus. Updated by the target's `focus` / `blur` events.                                                                                                                                                                                                   |
| `setFocused` | `Dispatch<SetStateAction<boolean>>` | Focus the target with `setFocused(true)`, blur it with `setFocused(false)`. Accepts the functional updater form (`setFocused(prev => !prev)`). As upstream, the call itself only invokes `focus()` / `blur()` on the element — the state is then updated by the `focus` / `blur` events. |

## React divergence from upstream

Upstream VueUse returns `{ focused: WritableComputedRef<boolean> }`, so consumers read and write
`focused.value`. This port follows the React idiom required by `AGENTS.md` and returns the tuple
`[isFocused, setFocused]` — read the state from element 0, focus / blur the target with element 1,
and there is no `.value`.

## Type Declarations

```ts
export interface UseFocusOptions extends ConfigurableWindow {
  /**
   * Initial value. If set true, then focus will be set on the target
   *
   * @default false
   */
  initialValue?: boolean
  /**
   * Replicate the:focus-visible behavior of CSS
   *
   * @default false
   */
  focusVisible?: boolean
  /**
   * Prevent scrolling to the element when it is focused.
   *
   * @default false
   */
  preventScroll?: boolean
}
export type UseFocusReturn = readonly [
  /**
   * If read as true, then the element has focus. If read as false, then the element does not have
   * focus. This is the plain React state updated by the target's `focus` / `blur` events.
   */
  isFocused: boolean,
  /**
   * If set to true, then the element will be focused. If set to false, the element will be blurred.
   * Accepts the React functional updater (`setFocused(prev => !prev)`). As upstream, the assignment
   * itself only calls `focus()` / `blur()` on the element — the state is then updated by the
   * `focus` / `blur` events.
   */
  setFocused: Dispatch<SetStateAction<boolean>>,
]
/**
 * Map from @vueuse/core `useFocus`
 * (`source/vueuse/packages/core/useFocus/`).
 *
 * @example
 * const input = useRef<HTMLInputElement>(null)
 * const [isFocused, setFocused] = useFocus(input)
 *
 * setFocused(true) // focus the input
 * setFocused(false) // blur the input
 */
export declare function useFocus(
  target: RefObject<HTMLElement | SVGElement | null | undefined>,
  options?: UseFocusOptions,
): UseFocusReturn
```
