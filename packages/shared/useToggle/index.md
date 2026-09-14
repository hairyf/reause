---
category: Utilities
---

# useToggle

A boolean (or value) toggler with controllable state support.

## Usage

```tsx
import { useToggle } from '@reause/shared'
import { useState } from 'react'

const [value, toggle] = useToggle()

// A State<T> input can be controlled with a React state tuple.
const controlled = useState(false)
const [controlledValue, controlledToggle] = useToggle(controlled)

toggle() // false → true
toggle() // true → false
toggle(false) // force to false
toggle(c => !c) // functional update
```

### Toggle Function

The toggle function can be called in two ways:

```tsx
const [value, toggle] = useToggle()

toggle() // toggle between true and false
toggle(true) // set to specific value
```

Unlike upstream, the toggle function does not return the new value — React
state updates are asynchronous, so read it from `value` on the next render.

### Custom Values

You can use custom truthy and falsy values instead of `true` and `false`:

```tsx
import { useToggle } from '@reause/shared'

const [value, toggle] = useToggle('on', {
  truthyValue: 'on',
  falsyValue: 'off',
})

toggle() // 'off'
toggle() // 'on'
```

Upstream allows the custom values to be reactive refs; this port accepts plain
values only.
