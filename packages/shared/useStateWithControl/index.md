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
