---
category: Elements
---

# useSplitter

Resizable panel layout with draggable, keyboard-accessible separators.

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

`getHandleProps` returns everything a separator needs: `role="separator"`,
`aria-orientation`, `aria-valuenow` / `aria-valuemin` / `aria-valuemax` (the
before-panel's working size and its resolved bounds), `tabIndex`,
`data-active`, `data-orientation` and the keyboard / double-click handlers.
Arrow keys move the adjacent pair by `step` — `shiftStep` with Shift,
reversed under `dir: 'rtl'` — `Home` / `End` drive the before-panel to its
minimum / maximum, and `Enter` toggles the collapse of the smaller collapsible
panel next to the handle.

Sizes are declared in CSS units. A bare `number` or a `%` string is a
**flexible** size that shares the leftover space by weight; a `px` or `rem`
string is a **fixed** size. The switch is global: as soon as _any_ pane size,
`min`, `max`, `collapseThreshold`, `step`, `shiftStep` or controlled size uses a
fixed unit, `pixelMode` turns on, every size is resolved to pixels, and a bare
number then means _percent of the container_ rather than a relative weight. The
hook returns `pixelMode` so a consumer can render accordingly.

```tsx
// A fixed sidebar plus a flexible content pane. `pixelMode` is true here, so the
// 240px pane keeps its width when the container is resized.
const splitter = useSplitter({
  panels: [{ defaultSize: '240px', min: '120px' }, { defaultSize: 100 }],
})

// Vertical orientation flips the axis, the cursor and the arrow keys.
const vertical = useSplitter({
  panels: [{ defaultSize: 50 }, { defaultSize: 50 }],
  orientation: 'vertical',
})
```

Each returned size keeps the unit it was declared in, so a `'240px'` pane stays
`'240px'` after a drag while its flexible neighbour becomes a percentage.
`collapse(panelIndex)` and `expand(panelIndex)` move a panel's whole size to its
neighbour and restore it from the snapshot taken before the collapse, and
`reset(handleIndex)` restores the two panels next to a handle to their default
ratio while preserving their combined size — the same thing a double-click on
the handle does while `resetOnDoubleClick` is left at its `true` default.

By default a drag only moves the two panels adjacent to the handle: when one of
them reaches its `min` or `max`, the drag stops there. Pass `redistribute` to
borrow from the panels beyond it — `'nearest'` takes from the closest panel in
the drag direction first, `'equal'` spreads the change over all of them, and a
function receives `{ sizes, panels, handleIndex, delta }` (all in resolved units)
and returns the sizes to use:

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

To drive the layout yourself, pass `sizes` as a controlled value and observe
`onSizeChange`; the hook then reports every resize without committing it.
`onResizeStart` and `onResizeEnd` bracket a pointer drag, `onCollapseChange`
fires once per panel that crosses into or out of the collapsed state, and
`enabled: false` disables both the pointer and the keyboard handlers.

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
