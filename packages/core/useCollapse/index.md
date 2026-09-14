---
category: Elements
---

# useCollapse

Animate an element's height between `0` and its measured content height.

## Usage

```tsx
import { useCollapse } from '@reause/core'
import { useState } from 'react'

function Demo() {
  const [expanded, setExpanded] = useState(false)
  const { state, getCollapseProps } = useCollapse({ expanded })

  return (
    <>
      <button onClick={() => setExpanded(prev => !prev)}>Toggle</button>
      <div {...getCollapseProps()}>
        <p>Collapsible content</p>
      </div>
    </>
  )
}
```

> **Important**: Re-evaluated on every render. Spread `getCollapseProps()` directly on the element instead of storing its result.

---

## Behavior

### `getCollapseProps(input?)`

Returns element props required to control accessibility and height animation:
`{ style, ref, onTransitionEnd, 'aria-hidden', inert }`

- **`style`**: Merges `input.style` with internal styles. Internal transition styles (`height`, `overflow`, `display`) override `input.style`, while preserving custom `border` and `padding`.
- **`ref`**: Merges internal node measurements with `input.ref` (supports Callback & Object Ref).
- **`onTransitionEnd`**: Internal transition completion handler.

> **Warning**: Do not override `onTransitionEnd` without chaining the original handler; otherwise, `state` will remain stuck in `entering` or `exiting`.

- **`aria-hidden` & `inert`**: Set to `!expanded`. When collapsed, content is hidden from accessibility trees and interactive focus.

---

### Key Options

#### `keepMounted` (boolean, default: `false`)

Controls style behavior when collapsed (does **not** control DOM unmounting):

| Option              | Collapsed Styles                                     | Behavior                            |
| ------------------- | ---------------------------------------------------- | ----------------------------------- |
| `false` _(default)_ | `{ height: 0, overflow: 'hidden', display: 'none' }` | Removed from layout & rendered tree |
| `true`              | `{ height: 0, overflow: 'hidden' }`                  | Retains layout box in DOM tree      |

_Unmounting the DOM node remains the responsibility of the consumer._

#### `transitionDuration` (number, optional)

If omitted, duration is auto-calculated via `getAutoHeightDuration(height)` based on `scrollHeight`:

```ts
const constant = height / 36
const duration = Math.round((4 + 15 * constant ** 0.25 + constant / 5) * 10)
```

_Unmeasurable heights (or non-numeric values) evaluate to `0ms` to prevent bogus animation timing._

---

## Internal Technical Notes

- **Synchronous Layout Measurement**: Uses React DOM's `flushSync` to measure and repaint the element synchronously before applying the exit transition, preventing height-jump glitches during collapse.
- **Event Handler Stability**: Callback props (`onTransitionStart`, `onTransitionEnd`) use latest-value refs rather than `useEffectEvent`, ensuring compatibility with React >= 18.0.
- **Utilities Exported**:
- `getElementHeight(ref)`: Returns `scrollHeight` or `'auto'`.
- `isMeasured(size)`: Type guard identifying transitionable elements (`0` is treated as unmeasurable).
