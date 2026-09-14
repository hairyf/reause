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

## Type Declarations

```ts
/**
 * The engine's pure helpers live in the sibling `./engine` module and are deliberately NOT
 * re-exported here. Only a type re-export crosses the module boundary (types are not collected by
 * `scripts/update.ts`'s `parseExports`), so this file mints no extra `meta/functions.md` rows:
 * every value the resolver sees from it is the hook itself.
 */
export type {
  SplitterPaneSize,
  SplitterStep,
  UseSplitterPanel,
  UseSplitterRedistributeFn,
  UseSplitterRedistributeInput,
  UseSplitterResolvedPanel,
} from "./engine"
export interface UseSplitterOptions {
  /** Panel configuration array (minimum 2 panels) */
  panels: UseSplitterPanel[]
  /** Layout direction, `'horizontal'` by default */
  orientation?: "horizontal" | "vertical"
  /** Controlled sizes, each value keeps the unit it was declared in */
  sizes?: SplitterPaneSize[]
  /** Called during resize with updated sizes, each value keeps its declared unit */
  onSizeChange?: (sizes: SplitterPaneSize[]) => void
  /** Called when drag starts */
  onResizeStart?: (handleIndex: number) => void
  /** Called when drag ends */
  onResizeEnd?: (handleIndex: number, sizes: SplitterPaneSize[]) => void
  /** Called when a panel collapses or expands */
  onCollapseChange?: (panelIndex: number, collapsed: boolean) => void
  /**
   * How to borrow space from non-adjacent panels when the immediate neighbor is at its min/max.
   * `'nearest'` takes from the nearest panel in the drag direction first. `'equal'` distributes
   * equally among all panels in the drag direction. A function receives sizes, panels, handleIndex
   * and delta, and returns new sizes. When not set, only the two adjacent panels are affected.
   */
  redistribute?: SplitterRedistribute
  /** Keyboard step size, a `number`/`%` is a percentage, `px`/`rem` is resolved to pixels, `1` by default */
  step?: SplitterStep
  /** Shift+arrow step size, a `number`/`%` is a percentage, `px`/`rem` is resolved to pixels, `10` by default */
  shiftStep?: SplitterStep
  /** Text direction for keyboard nav, `'ltr'` by default */
  dir?: "ltr" | "rtl"
  /** Restore the two panels adjacent to a handle to their default ratio (preserving their combined size) when the handle is double-clicked, `true` by default */
  resetOnDoubleClick?: boolean
  /** Enable/disable the hook, `true` by default */
  enabled?: boolean
}
export interface UseSplitterReturnValue<T extends HTMLElement = any> {
  /** Ref callback for the container element */
  ref: React.RefCallback<T | null>
  /** Current panel sizes, each value keeps the unit it was declared in */
  sizes: SplitterPaneSize[]
  /**
   * Whether sizes are tracked in pixels because any pane size, `min`, `max`, `step`, `shiftStep` or
   * `collapseThreshold` uses a fixed `px`/`rem` unit
   */
  pixelMode: boolean
  /** Which panels are currently collapsed */
  collapsed: boolean[]
  /** Index of handle being dragged, or -1 */
  activeHandle: number
  /** Get props to spread on each resize handle */
  getHandleProps: (input: { index: number }) => {
    ref: React.RefCallback<HTMLElement>
    role: "separator"
    "aria-orientation": "horizontal" | "vertical"
    "aria-valuenow": number
    "aria-valuemin": number
    "aria-valuemax": number
    tabIndex: number
    onKeyDown: React.KeyboardEventHandler
    onDoubleClick: React.MouseEventHandler
    "data-active": boolean | undefined
    "data-orientation": "horizontal" | "vertical"
  }
  /** Programmatically set sizes, each value keeps its declared unit */
  setSizes: (sizes: SplitterPaneSize[]) => void
  /** Collapse a panel */
  collapse: (panelIndex: number) => void
  /** Expand a collapsed panel */
  expand: (panelIndex: number) => void
  /** Toggle collapse of a panel */
  toggleCollapse: (panelIndex: number) => void
  /**
   * Reset the two panels adjacent to a handle to their default ratio, preserving their combined
   * size
   */
  reset: (handleIndex: number) => void
}
/**
 * Map from @mantine/hooks `useSplitter`
 * (`source/mantine/packages/@mantine/hooks/src/use-splitter/`).
 *
 * @example
 * const { ref, sizes, getHandleProps, reset } = useSplitter({
 *   panels: [{ defaultSize: 30, min: 10, collapsible: true }, { defaultSize: 70 }],
 *   orientation: 'horizontal',
 *   step: 1,
 * })
 *
 * // <div ref={ref} style={{ display: 'flex' }}>
 * //   <div style={{ flexGrow: sizes[0] }} />
 * //   <div {...getHandleProps({ index: 0 })} />
 * //   <div style={{ flexGrow: sizes[1] }} />
 * // </div>
 */
export declare function useSplitter<T extends HTMLElement = any>(
  options: UseSplitterOptions,
): UseSplitterReturnValue<T>
```
