---
category: Reactivity
alias: controlledRef
related: useStateHistory
---

# useStateWithControl

Fine-grained controls over a state and its re-renders

## Usage

```tsx
import { useStateWithControl } from '@reause/shared'

const [num, setNum, control] = useStateWithControl(0)

// State<T> sources are supported, including controlled state tuples:
const [
  controlled,
  setControlled,
  controlledControl
] = useStateWithControl([num, setNum])

// just like a normal useState pair
setNum(42)
// the rendered value updates on the next render, like any useState setter
console.log(num) // 42 after the next render

// set the value without triggering a re-render (upstream: without triggering
// reactivity)
control.set(30, false)
console.log(control.peek()) // 30 — internal value updated, component not re-rendered
console.log(num) // 42 (rendered value unchanged — the next triggering write recomputes from the internal 30)

// get the value without tracking (nothing to track in React — alias for the
// current value)
control.peek() // 30
control.get() // 30
```

### `peek`, `lay`, `untrackedGet`, `silentSet`

The untracked/silent shorthands from upstream are kept 1:1. The following lines are equivalent.

```tsx
// getting
control.get(false)
control.untrackedGet()
control.peek() // an alias for `untrackedGet`
```

```tsx
// setting
control.set('bar', false)
control.silentSet('bar')
control.lay('bar') // an alias for `silentSet`
```

## Configurations

### `onBeforeChange()`

`onBeforeChange` option is offered to give control over if a new value should be accepted. For
example:

```tsx
import { useStateWithControl } from '@reause/shared'

const [num, setNum] = useStateWithControl(0, {
  onBeforeChange(value, oldValue) {
    // disallow changes larger then ±5 in one operation
    if (Math.abs(value - oldValue) > 5)
      return false // returning `false` to dismiss the change
  },
})

setNum(current => current + 1)
console.log(num) // 1 after the next render

setNum(current => current + 6)
console.log(num) // 1 after the next render (change been dismissed)
```

### `onChanged()`

`onChanged` option fires synchronously after an accepted change, with less overhead compared to
an effect (upstream: `watch`):

```tsx
import { useStateWithControl } from '@reause/shared'

const [num, setNum] = useStateWithControl(0, {
  onChanged(value, oldValue) {
    console.log(value)
  },
})
```

## Type Declarations

```ts
export interface UseStateWithControlOptions<T> {
  /**
   * Callback function before the state changing.
   *
   * Returning `false` to dismiss the change.
   */
  onBeforeChange?: (value: T, oldValue: T) => void | boolean
  /**
   * Callback function after the state changed.
   *
   * This happens synchronously, with less overhead compared to an effect.
   */
  onChanged?: (value: T, oldValue: T) => void
}
export interface UseStateWithControlControls<T> {
  /**
   * Get the current value. The `tracking` argument is accepted for API parity with upstream but is
   * a no-op in React — there is no reactivity dependency collection during render.
   */
  get: (tracking?: boolean) => T
  /**
   * Set the value with fine-grained control. `triggering` controls whether the change re-renders
   * the component (defaults to `true`).
   */
  set: (value: T, triggering?: boolean) => void
  /**
   * Get the value without tracking in the reactivity system — alias for `get(false)`.
   */
  untrackedGet: () => T
  /**
   * Set the value without triggering the reactivity system — alias for `set(value, false)`.
   */
  silentSet: (value: T) => void
  /**
   * Alias for `untrackedGet()`.
   */
  peek: () => T
  /**
   * Alias for `silentSet(value)`.
   */
  lay: (value: T) => void
  /**
   * Reset the value back to the initial value passed to the hook.
   */
  reset: () => void
}
export type UseStateWithControlReturn<T> = [
  /**
   * Current value — identical to the `value` a plain `useState` would hold.
   */
  value: T,
  /**
   * Setter to update the value (value or updater form, like `setState`).
   */
  setValue: Dispatch<SetStateAction<T>>,
  /**
   * Fine-grained controls over the value: `get` / `set` / `peek` / `lay`, the untracked/silent
   * shorthands, and `reset`.
   */
  control: UseStateWithControlControls<T>,
]
/**
 * Map from @vueuse/shared `refWithControl`
 * (`source/vueuse/packages/shared/refWithControl/`).
 *
 * @param   state    State source: a plain value, getter, state tuple, or
 *                   `{ value, onChange }` controllable state.
 * @param   options
 * @return  A tuple `[value, setValue, control]` — the current value, a
 *          `setState`-like setter and the fine-grained control object.
 *
 * @example
 * const [num, setNum, control] = useStateWithControl(0)
 *
 * setNum(42) // just like a normal useState setter
 * control.set(30, false) // set the value without re-rendering
 * control.peek() // get the value without tracking
 */
export declare function useStateWithControl<T>(
  state: State<T>,
  options?: UseStateWithControlOptions<T>,
): UseStateWithControlReturn<T>
```
