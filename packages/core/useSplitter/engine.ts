// Pure sizing engine for `useSplitter` — the DOM-free half of the port.
//
// This module is deliberately NOT re-exported from `packages/core/index.ts`: it
// is an internal module of the `useSplitter` page, so the package's public API
// does not grow with the seventeen helpers and eight types that only the hook
// and its own tests consume. `scripts/update.ts` scans
// `packages/<pkg>/<page>/index.tsx` alone, so keeping the helpers out of
// `index.tsx` also keeps them out of the generated `meta/functions.md` port
// registry (a provenance table of *upstream* symbols — a local `clamp` would be
// a fabricated row).
//
// Ported from `@mantine/hooks`' `use-splitter`
// (`source/mantine/packages/@mantine/hooks/src/use-splitter/use-splitter.ts`),
// lines 5–623: the size types, the unit regexes, the pixel-mode detection, the
// resolvers/encoders, the redistribution strategies and the collapse checks.
// The React half (`useSplitter` itself, lines 625–1242) is turn 2's work and
// lives in the sibling `index.tsx`.

/**
 * Pane size expressed in CSS units. A bare `number` or `%` string is a flexible size (shares
 * the leftover space), `px`/`rem` strings are fixed sizes that keep their pixel size when the
 * container is resized.
 */
export type SplitterPaneSize = number | `${number}%` | `${number}px` | `${number}rem`

/**
 * Keyboard step expressed in CSS units. A bare `number` or `%` string is a percentage of the
 * container, `px`/`rem` strings are resolved to pixels.
 */
export type SplitterStep = number | `${number}%` | `${number}px` | `${number}rem`

export interface UseSplitterPanel {
  /** Initial size, a `number`/`%` is a flexible size, `px`/`rem` is a fixed size. A bare number is treated as a percentage. */
  defaultSize: SplitterPaneSize
  /** Minimum size in the same units as `defaultSize`, `0` by default */
  min?: SplitterPaneSize
  /** Maximum size in the same units as `defaultSize`, no limit by default */
  max?: SplitterPaneSize
  /** Whether this panel can be collapsed, `false` by default */
  collapsible?: boolean
  /** Size below which the panel snaps to collapsed, defaults to `min` */
  collapseThreshold?: SplitterPaneSize
}

/** Panel configuration resolved to numeric units (percent or pixels) passed to redistribute functions */
export interface UseSplitterResolvedPanel {
  /** Resolved default size in the same units as redistribute sizes */
  defaultSize: number
  /** Resolved minimum size */
  min?: number
  /** Resolved maximum size */
  max?: number
  /** Whether this panel can be collapsed */
  collapsible?: boolean
  /** Resolved collapse threshold */
  collapseThreshold?: number
}

export interface UseSplitterRedistributeInput {
  /** Current sizes before applying delta, in resolved units (percent or pixels) */
  sizes: number[]
  /** Resolved panel configurations, in the same units as `sizes` */
  panels: UseSplitterResolvedPanel[]
  /** Index of the handle being dragged */
  handleIndex: number
  /** Requested size change in resolved units (positive = grow before-panel) */
  delta: number
}

export type UseSplitterRedistributeFn = (input: UseSplitterRedistributeInput) => number[]

/**
 * The subset of `UseSplitterOptions` this engine reads. Declared structurally
 * rather than imported from `index.tsx` so the engine stays a leaf module: the
 * public `UseSplitterOptions` (turn 2) is assignable to it, and the engine never
 * needs the controlled/`on*` half of the option bag.
 */
export interface UseSplitterEngineOptions {
  /** Panel configuration array (minimum 2 panels) */
  panels: UseSplitterPanel[]
  /** Controlled sizes, each value keeps the unit it was declared in */
  sizes?: SplitterPaneSize[]
  /** Keyboard step size, a `number`/`%` is a percentage, `px`/`rem` is resolved to pixels, `1` by default */
  step?: SplitterStep
  /** Shift+arrow step size, a `number`/`%` is a percentage, `px`/`rem` is resolved to pixels, `10` by default */
  shiftStep?: SplitterStep
}

/**
 * How to borrow space from non-adjacent panels when the immediate neighbor is
 * at its min/max. `'nearest'` takes from the nearest panel in the drag direction
 * first, `'equal'` distributes equally among all panels in the drag direction,
 * a function receives sizes, panels, handleIndex and delta, and returns new
 * sizes. When not set, only the two adjacent panels are affected.
 */
export type SplitterRedistribute = 'nearest' | 'equal' | UseSplitterRedistributeFn

const PX_RE = /^(-?[\d.]+)px$/
const REM_RE = /^(-?[\d.]+)rem$/
const PERCENT_RE = /^(-?[\d.]+)%$/

/**
 * A size is *fixed* only when it carries an absolute CSS unit. Percent strings
 * and bare numbers are flexible: they share whatever space the fixed panes leave
 * behind, weighted by their ratio (`flex-grow` semantics).
 */
export function isFixedSize(size: SplitterPaneSize | undefined): boolean {
  return typeof size === 'string' && (PX_RE.test(size) || REM_RE.test(size))
}

/** Numeric part of a size, ignoring its unit. `'50%'` and `50` both yield `50`; `'10rem'` yields `10`. */
export function sizeMagnitude(size: SplitterPaneSize): number {
  return typeof size === 'number' ? size : Number.parseFloat(size)
}

/**
 * Whether the whole splitter tracks pixels. Upstream's switch is GLOBAL, not
 * per-panel: one fixed `px`/`rem` unit anywhere — a pane size, `min`, `max`,
 * `step`, `shiftStep`, `collapseThreshold` or a controlled size — flips every
 * size in the layout into pixels, and a bare number then means *percent of the
 * container* rather than a relative weight.
 */
export function detectPixelMode(options: UseSplitterEngineOptions): boolean {
  return (
    options.panels.some(
      panel =>
        isFixedSize(panel.defaultSize)
        || isFixedSize(panel.min)
        || isFixedSize(panel.max)
        || isFixedSize(panel.collapseThreshold),
    )
    || isFixedSize(options.step)
    || isFixedSize(options.shiftStep)
    || (options.sizes?.some(isFixedSize) ?? false)
  )
}

/**
 * Root font size in pixels, used to resolve `rem` sizes. Falls back to `16` when
 * there is no document (SSR / plain Node) and when the computed value is
 * unusable. In pixel mode `rem` sizes are resolved exactly once, against the
 * font size measured at that moment, so this must be read per interaction rather
 * than cached at module scope.
 */
export function getRootFontSize(): number {
  if (typeof window === 'undefined') {
    return 16
  }
  const fontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  return Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16
}

/**
 * Resolves one size to a working number. Outside pixel mode the size *is* its
 * magnitude (`'50%'` → `50`, `50` → `50`, `'240px'` → `240` — a fixed size in a
 * flexible layout is only reachable if it was the sole fixed unit, which cannot
 * happen because `detectPixelMode` would have flipped). In pixel mode the same
 * value means pixels: a bare number or a `%` string is a fraction of the
 * container, `rem` multiplies the root font size, `px` is itself.
 */
export function resolveSize(
  size: SplitterPaneSize,
  pixelMode: boolean,
  containerPx: number,
  rootFontSize: number,
): number {
  if (!pixelMode) {
    return sizeMagnitude(size)
  }

  if (typeof size === 'number') {
    return (size / 100) * containerPx
  }

  const percent = PERCENT_RE.exec(size)
  if (percent) {
    return (Number.parseFloat(percent[1]) / 100) * containerPx
  }

  const rem = REM_RE.exec(size)
  if (rem) {
    return Number.parseFloat(rem[1]) * rootFontSize
  }

  const px = PX_RE.exec(size)
  if (px) {
    return Number.parseFloat(px[1])
  }

  return 0
}

/**
 * Down-scaling factor applied to fixed panes when their combined pixel size overflows the
 * container, so they shrink to fit (matching `resolveWorkingSizes`). Returns `1` when nothing
 * overflows or the layout is not in pixel mode. Encoders divide by this to invert the scaling and
 * persist the original absolute sizes instead of the shrunk-to-fit ones.
 */
export function getFixedScale(
  sizes: SplitterPaneSize[],
  pixelMode: boolean,
  containerPx: number,
  rootFontSize: number,
): number {
  if (!pixelMode) {
    return 1
  }

  let fixedTotal = 0
  sizes.forEach((size) => {
    if (isFixedSize(size)) {
      fixedTotal += resolveSize(size, true, containerPx, rootFontSize)
    }
  })

  return fixedTotal > containerPx && fixedTotal > 0 ? containerPx / fixedTotal : 1
}

/**
 * Resolves all sizes to pixels at once. Fixed panes get their absolute pixel size, flexible panes
 * share the leftover space by their weight ratio – matching how the layout is rendered with
 * `flex-grow`, so drag math operates on the same pixel sizes the user sees.
 */
export function resolveWorkingSizes(
  sizes: SplitterPaneSize[],
  pixelMode: boolean,
  containerPx: number,
  rootFontSize: number,
): number[] {
  if (!pixelMode) {
    return sizes.map(size => sizeMagnitude(size))
  }

  let fixedTotal = 0
  let flexibleWeight = 0
  sizes.forEach((size) => {
    if (isFixedSize(size)) {
      fixedTotal += resolveSize(size, true, containerPx, rootFontSize)
    }
    else {
      flexibleWeight += sizeMagnitude(size)
    }
  })

  const leftover = Math.max(0, containerPx - fixedTotal)
  const fixedScale = getFixedScale(sizes, pixelMode, containerPx, rootFontSize)

  return sizes.map((size) => {
    if (isFixedSize(size)) {
      return resolveSize(size, true, containerPx, rootFontSize) * fixedScale
    }
    return flexibleWeight > 0 ? (sizeMagnitude(size) / flexibleWeight) * leftover : 0
  })
}

/**
 * Encodes one working pixel value back into the unit the pane was declared in.
 * Outside pixel mode a `%` string stays a `%` string and everything else stays a
 * bare number. In pixel mode a pane declared as a number/percent is returned as
 * a percent of the container, and a fixed pane is converted back through
 * `fixedScale` (`value / fixedScale` inverts the shrink-to-fit) so the persisted
 * size is the pane's absolute size rather than its rendered one.
 */
export function encodeSize(
  value: number,
  original: SplitterPaneSize,
  pixelMode: boolean,
  containerPx: number,
  rootFontSize: number,
  fixedScale: number = 1,
): SplitterPaneSize {
  if (!pixelMode) {
    return typeof original === 'string' && PERCENT_RE.test(original) ? `${value}%` : value
  }

  if (typeof original === 'number') {
    return containerPx > 0 ? (value / containerPx) * 100 : original
  }

  if (PERCENT_RE.test(original)) {
    return `${containerPx > 0 ? (value / containerPx) * 100 : Number.parseFloat(original)}%`
  }

  const absolute = fixedScale > 0 ? value / fixedScale : value

  if (REM_RE.test(original)) {
    return `${rootFontSize > 0 ? absolute / rootFontSize : 0}rem`
  }

  return `${absolute}px`
}

/**
 * Encodes working pixel sizes back to raw sizes after a resize, keeping the unit each pane was
 * declared in. Panes whose working size did not change keep their original raw value. When fixed
 * panes overflow the container they render down-scaled, so their working sizes are scaled back up to
 * absolute sizes (preserving their declared sizes). If the resize instead hands space to a flexible
 * pane the overflow clears and the layout leaves the down-scaled regime: every pane is then encoded
 * from its current working size – including untouched fixed panes (so they do not jump back to their
 * over-sized value) and untouched flexible panes (so a pane that was squeezed to `0` does not keep a
 * stale weight and steal the freed space on the next render).
 */
export function encodeWorkingSizes(
  nextWorking: number[],
  baseWorking: number[],
  baseRaw: SplitterPaneSize[],
  pixelMode: boolean,
  containerPx: number,
  rootFontSize: number,
): SplitterPaneSize[] {
  const fixedScale = getFixedScale(baseRaw, pixelMode, containerPx, rootFontSize)

  let fixedWorkingSum = 0
  nextWorking.forEach((value, i) => {
    if (isFixedSize(baseRaw[i])) {
      fixedWorkingSum += value
    }
  })
  const overflowCleared = fixedScale < 1 && fixedWorkingSum < containerPx - 1e-6
  const encodeScale = overflowCleared ? 1 : fixedScale

  return nextWorking.map((value, i) =>
    overflowCleared || Math.abs(value - baseWorking[i]) > 1e-6
      ? encodeSize(value, baseRaw[i], pixelMode, containerPx, rootFontSize, encodeScale)
      : baseRaw[i],
  )
}

/**
 * Resolves a panel's bounds into the working unit. Note the two defaults that
 * matter downstream: `min` resolves to `0` (never `undefined`) and `max` to the
 * whole container in pixel mode or `100` outside it, so `getMax` can only see
 * `undefined` when a caller builds a resolved panel by hand.
 */
export function resolvePanel(
  panel: UseSplitterPanel,
  pixelMode: boolean,
  containerPx: number,
  rootFontSize: number,
): UseSplitterResolvedPanel {
  return {
    defaultSize: resolveSize(panel.defaultSize, pixelMode, containerPx, rootFontSize),
    min: panel.min != null ? resolveSize(panel.min, pixelMode, containerPx, rootFontSize) : 0,
    max:
      panel.max != null
        ? resolveSize(panel.max, pixelMode, containerPx, rootFontSize)
        : pixelMode
          ? containerPx
          : 100,
    collapseThreshold:
      panel.collapseThreshold != null
        ? resolveSize(panel.collapseThreshold, pixelMode, containerPx, rootFontSize)
        : undefined,
    collapsible: panel.collapsible,
  }
}

/**
 * Resolves a keyboard step into the working unit — the same rules as a size, including the
 * pixel-mode reading of a bare number as a percentage of the container.
 */
export function resolveStep(
  step: SplitterStep,
  pixelMode: boolean,
  containerPx: number,
  rootFontSize: number,
): number {
  return resolveSize(step, pixelMode, containerPx, rootFontSize)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getMin(panel: UseSplitterResolvedPanel): number {
  return panel.min ?? 0
}

export function getMax(panel: UseSplitterResolvedPanel): number {
  return panel.max ?? Infinity
}

export function getCollapseThreshold(panel: UseSplitterResolvedPanel): number {
  return panel.collapseThreshold ?? getMin(panel)
}

/**
 * Which panels are currently collapsed. A panel is collapsed exactly when its
 * (raw) size is `0` — `0%`, `0`, `0px` and `0rem` all count, because the check
 * runs on the magnitude rather than on the raw value's type.
 */
export function getCollapsed(sizes: SplitterPaneSize[]): boolean[] {
  return sizes.map(size => sizeMagnitude(size) === 0)
}

/**
 * Snaps a collapsible panel to `0` when the drag pushes it below its collapse
 * threshold, handing its whole remaining size to the adjacent panel. Requires
 * the panel to be *shrinking* (`raw < sizes[...]`), so a panel sitting under its
 * threshold while being grown is never collapsed. Returns `null` when no
 * collapse applies — the caller then applies the constraints normally.
 */
export function checkCollapse(
  sizes: number[],
  panels: UseSplitterResolvedPanel[],
  handleIndex: number,
  delta: number,
): number[] | null {
  const beforeIdx = handleIndex
  const afterIdx = handleIndex + 1
  const beforePanel = panels[beforeIdx]
  const afterPanel = panels[afterIdx]

  const rawBefore = sizes[beforeIdx] + delta
  const rawAfter = sizes[afterIdx] - delta

  if (
    beforePanel.collapsible
    && rawBefore < getCollapseThreshold(beforePanel)
    && rawBefore < sizes[beforeIdx]
  ) {
    const result = [...sizes]
    result[afterIdx] += result[beforeIdx]
    result[beforeIdx] = 0
    return result
  }

  if (
    afterPanel.collapsible
    && rawAfter < getCollapseThreshold(afterPanel)
    && rawAfter < sizes[afterIdx]
  ) {
    const result = [...sizes]
    result[beforeIdx] += result[afterIdx]
    result[afterIdx] = 0
    return result
  }

  return null
}

/**
 * Moves the handle between two adjacent panels only. The pair's combined size is
 * the invariant: the delta is clamped into the range the pair can actually
 * realize, with each panel's bounds folded against the other's
 * (`effectiveBeforeMax`/`effectiveBeforeMin`), and the after-panel takes exactly
 * what is left over.
 */
export function applyAdjacentOnly(
  sizes: number[],
  panels: UseSplitterResolvedPanel[],
  handleIndex: number,
  delta: number,
): number[] {
  const result = [...sizes]
  const beforeIdx = handleIndex
  const afterIdx = handleIndex + 1

  const total = result[beforeIdx] + result[afterIdx]
  const effectiveBeforeMax = Math.min(getMax(panels[beforeIdx]), total - getMin(panels[afterIdx]))
  const effectiveBeforeMin = Math.max(getMin(panels[beforeIdx]), total - getMax(panels[afterIdx]))
  const newBefore = clamp(result[beforeIdx] + delta, effectiveBeforeMin, effectiveBeforeMax)
  result[beforeIdx] = newBefore
  result[afterIdx] = total - newBefore
  return result
}

/**
 * `'nearest'`: the growing panel takes as much as it can from the panels in the
 * drag direction, closest first, before touching a farther one. A positive delta
 * grows the before-panel and drains to its right; a negative delta grows the
 * after-panel and drains to its left. The growing panel's own `max` caps the
 * whole operation, so a drag that overshoots the cap leaves the donors untouched.
 */
export function redistributeNearest(
  sizes: number[],
  panels: UseSplitterResolvedPanel[],
  handleIndex: number,
  delta: number,
): number[] {
  const result = [...sizes]

  if (delta > 0) {
    const growIdx = handleIndex
    const maxGrow = getMax(panels[growIdx]) - result[growIdx]
    const wantedGrow = Math.min(delta, maxGrow)

    let taken = 0
    for (let i = handleIndex + 1; i < result.length && taken < wantedGrow; i += 1) {
      const canGive = result[i] - getMin(panels[i])
      const take = Math.min(canGive, wantedGrow - taken)
      result[i] -= take
      taken += take
    }

    result[growIdx] += taken
  }
  else if (delta < 0) {
    const growIdx = handleIndex + 1
    const maxGrow = getMax(panels[growIdx]) - result[growIdx]
    const wantedGrow = Math.min(Math.abs(delta), maxGrow)

    let taken = 0
    for (let i = handleIndex; i >= 0 && taken < wantedGrow; i -= 1) {
      const canGive = result[i] - getMin(panels[i])
      const take = Math.min(canGive, wantedGrow - taken)
      result[i] -= take
      taken += take
    }

    result[growIdx] += taken
  }

  return result
}

/**
 * `'equal'`: the requested change is spread over every panel in the drag
 * direction that is above its `min`. Donors that cannot cover an equal share are
 * drained and dropped from the pool, and the remaining need is redistributed
 * over the survivors — so a donor already sitting at `min` is skipped entirely
 * rather than absorbing part of the change. The `0.001` slack is upstream's
 * float tolerance: exact halves are treated as exhausted deliberately, which is
 * what stops the redistribution loop from spinning on a float residue.
 */
export function redistributeEqual(
  sizes: number[],
  panels: UseSplitterResolvedPanel[],
  handleIndex: number,
  delta: number,
): number[] {
  const result = [...sizes]

  if (delta > 0) {
    const growIdx = handleIndex
    const maxGrow = getMax(panels[growIdx]) - result[growIdx]
    const wantedGrow = Math.min(delta, maxGrow)

    const donors: number[] = []
    for (let i = handleIndex + 1; i < result.length; i += 1) {
      if (result[i] > getMin(panels[i])) {
        donors.push(i)
      }
    }

    let remaining = wantedGrow
    while (remaining > 0.001 && donors.length > 0) {
      const perDonor = remaining / donors.length
      const exhausted: number[] = []

      for (let d = 0; d < donors.length; d += 1) {
        const idx = donors[d]
        const canGive = result[idx] - getMin(panels[idx])
        const take = Math.min(canGive, perDonor)
        result[idx] -= take
        remaining -= take
        if (canGive <= perDonor + 0.001) {
          exhausted.push(d)
        }
      }

      for (let i = exhausted.length - 1; i >= 0; i -= 1) {
        donors.splice(exhausted[i], 1)
      }

      if (exhausted.length === 0) {
        break
      }
    }

    result[growIdx] += wantedGrow - remaining
  }
  else if (delta < 0) {
    const growIdx = handleIndex + 1
    const maxGrow = getMax(panels[growIdx]) - result[growIdx]
    const wantedGrow = Math.min(Math.abs(delta), maxGrow)

    const donors: number[] = []
    for (let i = handleIndex; i >= 0; i -= 1) {
      if (result[i] > getMin(panels[i])) {
        donors.push(i)
      }
    }

    let remaining = wantedGrow
    while (remaining > 0.001 && donors.length > 0) {
      const perDonor = remaining / donors.length
      const exhausted: number[] = []

      for (let d = 0; d < donors.length; d += 1) {
        const idx = donors[d]
        const canGive = result[idx] - getMin(panels[idx])
        const take = Math.min(canGive, perDonor)
        result[idx] -= take
        remaining -= take
        if (canGive <= perDonor + 0.001) {
          exhausted.push(d)
        }
      }

      for (let i = exhausted.length - 1; i >= 0; i -= 1) {
        donors.splice(exhausted[i], 1)
      }

      if (exhausted.length === 0) {
        break
      }
    }

    result[growIdx] += wantedGrow - remaining
  }

  return result
}

/**
 * Entry point of the redistribution rules. A caller-supplied function replaces
 * the whole step (it receives a copy of `sizes`, the resolved panels, the handle
 * index and the delta) and its return value is used verbatim — no clamping, no
 * collapse check, no sum repair.
 *
 * The two built-in strategies do run a collapse pass, and it is *not*
 * `checkCollapse`: it tests the post-redistribution sizes (not `sizes + delta`)
 * and moves the freed size to the adjacent panel without the "must be shrinking"
 * guard the adjacent-only path has. A panel that redistribution squeezed to
 * exactly `0` therefore still counts as collapsed (it is below its threshold and
 * below its previous size), while a panel sitting at `0` beforehand does not
 * (`0 < 0` is false).
 */
export function applyConstraints(
  sizes: number[],
  panels: UseSplitterResolvedPanel[],
  handleIndex: number,
  delta: number,
  redistribute?: SplitterRedistribute,
): number[] {
  if (typeof redistribute === 'function') {
    return redistribute({ sizes: [...sizes], panels, handleIndex, delta })
  }

  if (redistribute === 'nearest' || redistribute === 'equal') {
    const strategy = redistribute === 'nearest' ? redistributeNearest : redistributeEqual
    const result = strategy(sizes, panels, handleIndex, delta)

    const beforeIdx = handleIndex
    const afterIdx = handleIndex + 1
    const beforePanel = panels[beforeIdx]
    const afterPanel = panels[afterIdx]

    if (
      beforePanel.collapsible
      && result[beforeIdx] < getCollapseThreshold(beforePanel)
      && result[beforeIdx] < sizes[beforeIdx]
    ) {
      const freed = result[beforeIdx]
      result[afterIdx] += freed
      result[beforeIdx] = 0
    }
    else if (
      afterPanel.collapsible
      && result[afterIdx] < getCollapseThreshold(afterPanel)
      && result[afterIdx] < sizes[afterIdx]
    ) {
      const freed = result[afterIdx]
      result[beforeIdx] += freed
      result[afterIdx] = 0
    }

    return result
  }

  const collapsed = checkCollapse(sizes, panels, handleIndex, delta)
  if (collapsed) {
    return collapsed
  }

  return applyAdjacentOnly(sizes, panels, handleIndex, delta)
}

/**
 * The `reset` primitive: restore the two panels adjacent to `handleIndex` to
 * their *default ratio* while preserving the pair's combined working size, then
 * fold that target through the same min/max pair clamp a drag uses (a panel whose
 * `min` forbids its ratio share wins, and the other panel takes the remainder).
 * Every other panel is left untouched, and the returned array is a fresh one —
 * a reset that would move nothing still returns a copy, because the caller always
 * re-encodes and re-publishes it.
 *
 * A pair whose declared defaults are both `0` has no ratio to restore, so both
 * panels fall back to an even split of the pair's total.
 */
export function resetAdjacentSizes(
  sizes: number[],
  panels: UseSplitterResolvedPanel[],
  handleIndex: number,
): number[] {
  const beforeIdx = handleIndex
  const afterIdx = handleIndex + 1
  if (beforeIdx < 0 || afterIdx >= sizes.length) {
    return [...sizes]
  }

  const total = sizes[beforeIdx] + sizes[afterIdx]
  const defBefore = panels[beforeIdx].defaultSize
  const defAfter = panels[afterIdx].defaultSize
  const defTotal = defBefore + defAfter
  const targetBefore = defTotal === 0 ? total / 2 : total * (defBefore / defTotal)

  return applyAdjacentOnly(sizes, panels, beforeIdx, targetBefore - sizes[beforeIdx])
}
