---
category: Sensors
---

# useKeyPress

Listen for a key press by `keyCode`, alias or modifier combination, and hand the handler both the event and the key that fired.

## Usage

```tsx
import { useKeyPress } from '@reause/core'

function App() {
  // every segment must match: `ctrl.a` needs ctrl held and keyCode 65
  useKeyPress('ctrl.a', (event) => {
    event.preventDefault()
    console.log('ctrl + a')
  })

  // an array reports the filter that matched as `key`
  useKeyPress(
    ['c', 'shift.c', 'shift.ctrl.c'],
    (event, key) => console.log('matched filter:', key),
    { exactMatch: true },
  )
}
```

Aliases may be mixed with raw key codes, and the filter is read on every render, so an inline predicate or a rebuilt array is fine:

```tsx
useKeyPress('CapsLock', handler) // case-insensitive alias (keyCode 20)
useKeyPress(['numpad0', 'arrowleft'], handler)
useKeyPress([48, 65], handler) // raw keyCodes: '0' and 'a'
useKeyPress(event => event.key === 'Escape', handler)
```

`exactMatch` blocks a superset of modifiers; without it `ctrl` also fires while `ctrl+a` is pressed:

```tsx
useKeyPress('ctrl', handler, { exactMatch: true })
```

`events`, `target` and `useCapture` mirror upstream — an element, a ref, or a resolver, and the capture phase:

```tsx
const panelRef = useRef<HTMLDivElement>(null)

// keydown by default; keyup sees a modifier's own release through its keyCode
useKeyPress('meta', handler, { events: ['keyup'] })

useKeyPress('escape', handler, { target: panelRef })
useKeyPress('escape', handler, { target: panelRef, useCapture: true })
useKeyPress('escape', handler, { target: () => document.body })
```

For the `useKeyStroke` alternative, remember what an array means there: `useKeyStroke(['a', 'b'])` matches `event.key` membership and returns a stop function, while `useKeyPress(['a', 'b'])` resolves both entries through the key-code parser and reports `'a'` or `'b'` to the handler.

## Type Declarations

```ts
/** A keyboard event identifier: either a `keyCode` (number) or a key filter (string). */
export type KeyType = number | string
/** Custom filter: return the matched key to fire with it, or a falsy value to skip the event. */
export type KeyPressPredicate = (
  event: KeyboardEvent,
) => KeyType | boolean | undefined
/** A single key, an array of keys, or a custom predicate. */
export type KeyPressFilter = KeyType | KeyType[] | KeyPressPredicate
export type KeyPressEvent = "keydown" | "keyup"
/**
 * Event target: a React ref object (`RefObject`) holding the event target (AGENTS.md §2).
 */
export type KeyPressTarget = RefObject<EventTarget | null | undefined>
export interface UseKeyPressOptions {
  /**
   * Events to listen to. Every name is registered and removed symmetrically.
   *
   * @default ['keydown']
   */
  events?: KeyPressEvent[]
  /**
   * Element to bind the listeners to. Accepts a React ref object (`RefObject`) holding the element,
   * and falls back to `window`.
   *
   * @default window
   */
  target?: KeyPressTarget
  /**
   * Require the event to carry **exactly** the filtered modifiers, so listening for `ctrl` no
   * longer fires while `ctrl+a` is pressed.
   *
   * @default false
   */
  exactMatch?: boolean
  /**
   * Register the listeners in the capture phase.
   *
   * @default false
   */
  useCapture?: boolean
}
/**
 * Map from ahooks `useKeyPress`
 * (`source/ahooks/packages/hooks/src/useKeyPress/`).
 *
 * @example
 * useKeyPress('ctrl.a', event => event.preventDefault())
 *
 * // An array fires once and reports which filter matched as `key`:
 * useKeyPress(['c', 'shift.c', 'shift.ctrl.c'], (event, key) => console.log(key))
 *
 * // Exact matching: `ctrl` must not fire while `ctrl+a` is held.
 * useKeyPress('ctrl', handler, { exactMatch: true })
 *
 * // A specific element, other events, capture phase:
 * useKeyPress('escape', handler, { target: panelRef, events: ['keyup'], useCapture: true })
 */
export declare function useKeyPress(
  keyFilter: KeyPressFilter,
  eventHandler: (event: KeyboardEvent, key: KeyType) => void,
  option?: UseKeyPressOptions,
): void
```
