---
category: Elements
---

# useSplitter

A hook for resizable panel layouts that supports dragging and keyboard interactions.

## Usage

```tsx
import { useSplitter } from '@reause/core'

const splitter = useSplitter({
  panels: [
    { defaultSize: 30, min: 10, collapsible: true },
    { defaultSize: 70 },
  ],
})

// <div ref={splitter.ref} style={{ display: 'flex', height: 300 }}>
//   <div style={{ flexGrow: splitter.sizes[0] }} />
//   <div {...splitter.getHandleProps({ index: 0 })} />
//   <div style={{ flexGrow: splitter.sizes[1] }} />
// </div>
```

### Separator Attributes and Interactions (`getHandleProps`)

`getHandleProps` returns all accessible attributes and event handlers required for the separator handle:

- **Accessibility Attributes**: `role="separator"`, `aria-orientation`, `aria-valuenow` / `aria-valuemin` / `aria-valuemax` (calculated based on the size and boundaries of the left/top panel), `tabIndex`.
- **State and Style Markers**: `data-active`, `data-orientation`.
- **Keyboard and Double-Click Interactions**:
- `Arrow keys`: Adjust adjacent panels incrementally by `step` (uses `shiftStep` when holding `Shift`; direction is reversed in `dir: 'rtl'` mode).
- `Home` / `End`: Instantly snap the left/top panel to its minimum/maximum limit.
- `Enter`: Toggle the collapsed state of the smaller adjacent collapsible panel.
- `Double-click`: Trigger a reset (enabled by default when `resetOnDoubleClick` is `true`).

### Unit Control and Pixel Mode (`pixelMode`)

Panel sizes support CSS unit declarations:

- **Flexible Mode**: Pure numbers without units or `%` strings, distributing remaining space based on weight.
- **Fixed Mode**: Strings containing `px` or `rem`.

If any fixed unit appears in panel sizes, `min`, `max`, `collapseThreshold`, `step`, `shiftStep`, or controlled sizes, the hook automatically enables `pixelMode`. In this mode, all sizes are parsed and converted to pixels, and pure numbers are interpreted as **container percentages** rather than relative weights. Developers can render synchronously using the returned `pixelMode`.

```tsx
// Pixel mode example: Sidebar fixed at 240px, content area responsive (sidebar remains 240px wide on container resize)
const splitter = useSplitter({
  panels: [{ defaultSize: '240px', min: '120px' }, { defaultSize: 100 }],
})

// Vertical layout example: Automatically switches axes, cursors, and arrow key responses
const vertical = useSplitter({
  panels: [{ defaultSize: 50 }, { defaultSize: 50 }],
  orientation: 'vertical',
})
```

### Size Update Mechanism

1. **Unit Preservation**: Panels retain their declared unit type after resizing (for example, `'240px'` remains `'240px'` after dragging, while its adjacent flexible panel automatically adapts to percentage).
2. **Collapse Control**: Calling `collapse(panelIndex)` or `expand(panelIndex)` can absorb panel size into adjacent panels or restore the snapshot size saved prior to collapsing.
3. **Space Reset**: Calling `reset(handleIndex)` restores the default ratios of adjacent panels while preserving their combined size.

### Redistribution Mode (`redistribute`)

By default, dragging only adjusts the two panels immediately adjacent to the separator. To push beyond this limitation and affect outer panels, configure `redistribute`:

- `'nearest'`: Prioritizes taking space from the nearest panel in the drag direction.
- `'equal'`: Distributes the size delta evenly across all panels in the drag direction.
- `Custom Function`: Pass a custom function `({ sizes, panels, handleIndex, delta }) => resolvedSizes` for precise control.

```tsx
const splitter = useSplitter({
  panels: [
    { defaultSize: 26 },
    { defaultSize: 20, min: 20 },
    { defaultSize: 54 },
  ],
  redistribute: 'nearest',
})
```

### Controlled Mode and Event Listeners

Supports passing `sizes` for controlled management, with event listeners for monitoring state changes:

- `onSizeChange`: Triggered when sizes change (in controlled mode, this only notifies and does not automatically update internal state).
- `onResizeStart` / `onResizeEnd`: Callbacks for the start and end of pointer dragging.
- `onCollapseChange`: Triggered when a panel toggles between collapsed and expanded states.
- `enabled: false`: Disables pointer and keyboard interactions in one toggle.
