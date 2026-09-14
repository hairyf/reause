---
category: Sensors
---

# useKeyModifier

Reactive [Modifier State](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState). Tracks state of any of the [supported modifiers](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState#browser_compatibility)

## Usage

```tsx
import { useKeyModifier } from '@reause/core'

const capsLockState = useKeyModifier('CapsLock') // boolean | null

console.log(capsLockState)
```

## Events

You can customize which events will prompt the state to update. By default, these are `mouseup`, `mousedown`, `keyup`, `keydown`. To customize these events:

```tsx
import { useKeyModifier } from '@reause/core'

const capsLockState = useKeyModifier('CapsLock', { events: ['mouseup', 'mousedown'] })

console.log(capsLockState) // null

// Caps Lock turned on with key press
console.log(capsLockState) // null

// Mouse button clicked
console.log(capsLockState) // true
```

## Initial State

By default, the returned controllable state will be `null` until the first event is received. You can explicitly pass the initial state to it via:

```tsx
import { useKeyModifier } from '@reause/core'

const capsLockState1 = useKeyModifier('CapsLock') // boolean | null
const capsLockState2 = useKeyModifier('CapsLock', { initial: false }) // boolean
```

## Type Declarations

```ts
export type KeyModifier =
  | "Alt"
  | "AltGraph"
  | "CapsLock"
  | "Control"
  | "Fn"
  | "FnLock"
  | "Meta"
  | "NumLock"
  | "ScrollLock"
  | "Shift"
  | "Symbol"
  | "SymbolLock"
export interface UseModifierOptions<Initial> {
  /**
   * Event names that will prompt update to modifier states
   *
   * @default ['mousedown', 'mouseup', 'keydown', 'keyup']
   */
  events?: (keyof WindowEventMap)[]
  /**
   * Initial value of the returned state
   *
   * @default null
   */
  initial?: Initial
  /**
   * Specify a custom `document` instance, e.g. working with iframes or in testing environments.
   */
  document?: Document
}
export type UseKeyModifierReturn<Initial> = Initial extends boolean
  ? boolean
  : boolean | null
/**
 * Map from @vueuse/core `useKeyModifier`
 * (`source/vueuse/packages/core/useKeyModifier/`).
 *
 * @example
 * const capsLockState = useKeyModifier('CapsLock') // boolean | null
 */
export declare function useKeyModifier<Initial extends boolean | null>(
  modifier: KeyModifier,
  options?: UseModifierOptions<Initial>,
): UseKeyModifierReturn<Initial>
```
