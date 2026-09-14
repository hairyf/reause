---
category: Elements
---

# useActiveElement

Reactive `document.activeElement`

## Usage

```tsx
import { useActiveElement } from '@reause/core'

const activeElement = useActiveElement()

// React keyed on the element — re-runs when focus moves
useEffect(() => {
  console.log('focus changed to', activeElement)
}, [activeElement])
```

### Options

| Option             | Type                     | Default                            | Description                                                                                           |
| ------------------ | ------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `deep`             | `boolean`                | `true`                             | Traverse into open shadow roots to find the deeply active element                                     |
| `triggerOnRemoval` | `boolean`                | `false`                            | Re-read the active element when the tracked element is removed from the DOM (`MutationObserver`)      |
| `document`         | `Document \| ShadowRoot` | the resolved `window`'s `document` | Custom `Document` or open `ShadowRoot` to read `activeElement` from — e.g. a shadow root or an iframe |
| `window`           | `Window`                 | the global `window` on the client  | Custom `Window` instance — e.g. an iframe's `window` or a testing environment                         |

### Shadow DOM Support

By default, `useActiveElement` will traverse into shadow DOM to find the deeply active element. Set `deep: false` to disable this behavior.

```tsx
import { useActiveElement } from '@reause/core'

// Only get the shadow host, not the element inside shadow DOM
const activeElement = useActiveElement({ deep: false })
```

### Track Element Removal

Set `triggerOnRemoval: true` to update the active element when the currently active element is removed from the DOM. This uses a `MutationObserver` under the hood.

```tsx
import { useActiveElement } from '@reause/core'

const activeElement = useActiveElement({ triggerOnRemoval: true })
```

### Custom document / window

Read `activeElement` from a different root than the global `document` — an open shadow root, an iframe's document, or a test environment. `document` wins when both are given; otherwise it falls back to the resolved `window`'s `document`. The `blur` / `focus` / `pointerdown` listeners are always bound to the resolved `window`.

```tsx
import { useActiveElement } from '@reause/core'

// Read from an open shadow root instead of document
const activeElement = useActiveElement({ document: shadowRoot })

// Read from another window (its document is used when `document` is omitted)
const activeElementInFrame = useActiveElement({ window: iframe.contentWindow })
```
