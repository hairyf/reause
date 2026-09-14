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
