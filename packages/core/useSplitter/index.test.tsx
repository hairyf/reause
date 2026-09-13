import type { SplitterPaneSize, UseSplitterResolvedPanel } from './engine'
import type { UseSplitterOptions, UseSplitterReturnValue } from './index'
import { act as reactAct } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import {
  applyAdjacentOnly,
  applyConstraints,
  checkCollapse,
  clamp,
  detectPixelMode,
  encodeSize,
  encodeWorkingSizes,
  getCollapsed,
  getCollapseThreshold,
  getFixedScale,
  getMax,
  getMin,
  getRootFontSize,
  isFixedSize,
  redistributeEqual,
  redistributeNearest,
  resetAdjacentSizes,
  resolvePanel,
  resolveSize,
  resolveStep,
  resolveWorkingSizes,
  sizeMagnitude,
} from './engine'
import { useSplitter } from './index'

/**
 * Tests for `useSplitter`, in two halves, both in one file.
 *
 * The first half is the pure sizing engine. Upstream's suite
 * (`use-splitter.test.tsx`, 1270 lines) drives those code paths through
 * `renderHook` + `fireEvent`, which is why its CSS-unit block needs a
 * `getBoundingClientRect` spy: the hook's keyboard and drag handlers are the
 * only public way in. Porting the arithmetic directly lets each upstream
 * assertion about resolved sizes, redistribution and collapse be reproduced as
 * a plain function call.
 *
 * The second half is the hook itself — the DOM behaviours (refs, pointer drag,
 * keyboard navigation, the ARIA prop bag, collapse/expand/reset, controlled
 * sizing, the ResizeObserver measurement and unmount cleanup) that upstream
 * exercises with `render` + `fireEvent`. They live in the same file on purpose:
 * a `.ts` test is collected by no vitest project (the browser project's include
 * glob is `packages/**\/*.{test,spec}.tsx`, the exports project's is `test/*.ts`
 * plus `packages/skills/*.ts`), so splitting the engine tests out would silently
 * drop them from CI.
 *
 * Several of the fixed-size expectations below (`1000px` container, `16` root
 * font size) are exactly the numbers upstream's `UnitHarness` mocks, so a
 * regression in the unit model fails here with the same numbers it would fail
 * with there.
 */

const CONTAINER = 1000
const ROOT_FONT = 16

/** Resolved panels with no upper bound — the shape a hand-built strategy test wants. */
function panels(spec: { defaultSize: number, min?: number, max?: number, collapsible?: boolean, collapseThreshold?: number }[]): UseSplitterResolvedPanel[] {
  return spec.map(panel => ({
    defaultSize: panel.defaultSize,
    min: panel.min ?? 0,
    max: panel.max ?? Infinity,
    collapsible: panel.collapsible,
    collapseThreshold: panel.collapseThreshold,
  }))
}

/**
 * Resolved panels as `resolvePanel` actually builds them: `min` 0 and `max` the
 * container when undeclared. The distinction matters — an undeclared `max` in
 * pixel mode clamps every panel to the container width, which bounds what a
 * default-ratio reset can restore.
 */
function pixelPanels(containerPx: number, spec: { defaultSize: number, min?: number, max?: number, collapsible?: boolean, collapseThreshold?: number }[]): UseSplitterResolvedPanel[] {
  return spec.map(panel => ({
    defaultSize: panel.defaultSize,
    min: panel.min ?? 0,
    max: panel.max ?? containerPx,
    collapsible: panel.collapsible,
    collapseThreshold: panel.collapseThreshold,
  }))
}

describe('unit predicates', () => {
  it('treats px and rem strings as fixed, and everything else as flexible', () => {
    // `isFixedSize` runs on the *raw* value: a bare number and a percent string
    // are flexible even though a bare number is a percentage of the container.
    expect(isFixedSize('240px')).toBe(true)
    expect(isFixedSize('10rem')).toBe(true)
    expect(isFixedSize('-12.5px')).toBe(true)
    expect(isFixedSize('0px')).toBe(true)
    expect(isFixedSize(240)).toBe(false)
    expect(isFixedSize('60%')).toBe(false)
    // A bare numeric *string* is not even a legal `SplitterPaneSize` — the TS type
    // rejects it, which is why this one line casts. Runtime-wise it is flexible.
    expect(isFixedSize('0' as any)).toBe(false)
    expect(isFixedSize(undefined)).toBe(false)
  })

  it('rejects near-miss unit spellings rather than parsing them loosely', () => {
    // The regexes are anchored and single-unit: `em`, `vw`, `pixel`, an
    // upper-cased unit and a trailing space are all *flexible* sizes as far as
    // upstream is concerned — `Number.parseFloat` would happily read a number out
    // of every one of them. The last entry is a numeric string rather than a
    // `${number}%` template literal, so it needs the cast; the others are
    // near-misses the type would already reject, hence the untyped array.
    for (const value of ['240em', '240vw', '240pixel', '240 px', 'px240', '240PX', '240px ', '0'])
      expect(isFixedSize(value as any), value).toBe(false)
  })

  it('reads the magnitude of every unit form', () => {
    expect(sizeMagnitude(50)).toBe(50)
    expect(sizeMagnitude('50%')).toBe(50)
    expect(sizeMagnitude('240px')).toBe(240)
    expect(sizeMagnitude('10.5rem')).toBe(10.5)
    expect(sizeMagnitude('-20%')).toBe(-20)
  })
})

describe('detectPixelMode', () => {
  it('stays off for a flexible-only layout', () => {
    expect(detectPixelMode({ panels: [{ defaultSize: 30 }, { defaultSize: 70 }] })).toBe(false)
    expect(detectPixelMode({ panels: [{ defaultSize: '30%' }, { defaultSize: 70 }] })).toBe(false)
  })

  it('flips for a fixed pane size', () => {
    expect(detectPixelMode({ panels: [{ defaultSize: '240px' }, { defaultSize: 60 }] })).toBe(true)
    expect(detectPixelMode({ panels: [{ defaultSize: '10rem' }, { defaultSize: 90 }] })).toBe(true)
  })

  it('flips for a fixed min or max even when every size is flexible', () => {
    expect(detectPixelMode({ panels: [{ defaultSize: 30, min: '100px' }, { defaultSize: 70 }] })).toBe(true)
    expect(detectPixelMode({ panels: [{ defaultSize: 30 }, { defaultSize: 70, max: '5rem' }] })).toBe(true)
  })

  it('flips when only collapseThreshold uses a fixed unit', () => {
    // Upstream's `enables pixel mode when only collapseThreshold uses a fixed
    // unit`: pane 0 declares `30` and the engine reads it as 30% of the 1000px
    // container, not as a 30px pane.
    const options = { panels: [{ defaultSize: 30, collapsible: true, collapseThreshold: '120px' as const }, { defaultSize: 70 }] }
    expect(detectPixelMode(options)).toBe(true)
    const resolved = options.panels.map(panel => resolvePanel(panel, true, CONTAINER, ROOT_FONT))
    const working = resolveWorkingSizes([30, 70], true, CONTAINER, ROOT_FONT)
    expect(working[0]).toBe(300)
    expect(getCollapseThreshold(resolved[0])).toBe(120)
  })

  it('flips for a fixed unit on a panel that is neither first nor last', () => {
    // The switch is GLOBAL, so a fixed unit anywhere in the panel list flips the
    // whole layout. A per-panel reading of these same options would leave them
    // flexible: `panels[0]` and `panels[2]` are both bare numbers.
    expect(detectPixelMode({
      panels: [{ defaultSize: 30 }, { defaultSize: 40, min: '5rem' }, { defaultSize: 30 }],
    })).toBe(true)
    expect(detectPixelMode({
      panels: [{ defaultSize: 30 }, { defaultSize: 40 }, { defaultSize: 30, max: '10px' }],
    })).toBe(true)
    expect(detectPixelMode({
      panels: [{ defaultSize: 30 }, { defaultSize: 40 }, { defaultSize: 30, collapseThreshold: '8px' }],
    })).toBe(true)
    // Control: the same three panels with no fixed unit anywhere stay flexible.
    expect(detectPixelMode({
      panels: [{ defaultSize: 30 }, { defaultSize: 40 }, { defaultSize: 30 }],
    })).toBe(false)
  })

  it('flips for a fixed step or shiftStep on an otherwise flexible layout', () => {
    expect(detectPixelMode({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], step: '10px' })).toBe(true)
    expect(detectPixelMode({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], shiftStep: '2rem' })).toBe(true)
    expect(detectPixelMode({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], step: 1 })).toBe(false)
  })

  it('flips for a controlled size even when the panels are all flexible', () => {
    // The switch is global and also reads the `sizes` option, so a controlled
    // `'240px'` re-interprets every panel.
    expect(detectPixelMode({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], sizes: ['240px', 60] })).toBe(true)
    expect(detectPixelMode({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], sizes: [40, 60] })).toBe(false)
  })
})

describe('getRootFontSize', () => {
  it('reads the document root font size when a document exists', () => {
    // This file runs in vitest's browser project (the only project whose include
    // glob is `*.test.tsx` — see the note at the top of the file), so `window`
    // exists here and the `typeof window === 'undefined'` guard is NOT taken:
    // the value must equal the document's computed root font size. The SSR fallback
    // branch is therefore reasoned, not exercised by this suite.
    expect(typeof window).toBe('object')
    const measured = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    expect(getRootFontSize()).toBe(measured)
    expect(getRootFontSize()).toBeGreaterThan(0)
  })
})

describe('resolveSize', () => {
  it('returns the magnitude untouched outside pixel mode, units included', () => {
    expect(resolveSize(50, false, CONTAINER, ROOT_FONT)).toBe(50)
    expect(resolveSize('50%', false, CONTAINER, ROOT_FONT)).toBe(50)
    expect(resolveSize('-25%', false, CONTAINER, ROOT_FONT)).toBe(-25)
  })

  it('reads a bare number as a percentage of the container in pixel mode', () => {
    expect(resolveSize(30, true, CONTAINER, ROOT_FONT)).toBe(300)
    expect(resolveSize(0, true, CONTAINER, ROOT_FONT)).toBe(0)
  })

  it('reads a percent string as a percentage and a px string as itself', () => {
    expect(resolveSize('60%', true, CONTAINER, ROOT_FONT)).toBe(600)
    expect(resolveSize('240px', true, CONTAINER, ROOT_FONT)).toBe(240)
    expect(resolveSize('0px', true, CONTAINER, ROOT_FONT)).toBe(0)
  })

  it('resolves rem against the supplied root font size', () => {
    expect(resolveSize('10rem', true, CONTAINER, ROOT_FONT)).toBe(160)
    expect(resolveSize('10rem', true, CONTAINER, 20)).toBe(200)
    expect(resolveSize('0.5rem', true, CONTAINER, ROOT_FONT)).toBe(8)
  })

  it('never divides by the container when it has not been measured', () => {
    // `containerPx` is 0 before the ResizeObserver reports, so a percentage
    // resolves to 0 rather than NaN.
    expect(resolveSize(30, true, 0, ROOT_FONT)).toBe(0)
    expect(resolveSize('60%', true, 0, ROOT_FONT)).toBe(0)
    // A fixed size is container-independent, so it survives an unmeasured container.
    expect(resolveSize('240px', true, 0, ROOT_FONT)).toBe(240)
  })
})

describe('resolveStep', () => {
  it('uses the same pixel-mode rules as a size', () => {
    expect(resolveStep(1, false, CONTAINER, ROOT_FONT)).toBe(1)
    expect(resolveStep(10, false, CONTAINER, ROOT_FONT)).toBe(10)
    // `treats a bare-number step as a percentage of the container in pixel mode`
    expect(resolveStep(1, true, CONTAINER, ROOT_FONT)).toBe(10)
    // `applies a pixel keyboard step to a fixed pane`
    expect(resolveStep('10px', true, CONTAINER, ROOT_FONT)).toBe(10)
    expect(resolveStep('2rem', true, CONTAINER, ROOT_FONT)).toBe(32)
  })
})

describe('resolvePanel', () => {
  it('defaults min to 0 and max to 100 outside pixel mode', () => {
    const resolved = resolvePanel({ defaultSize: 30 }, false, CONTAINER, ROOT_FONT)
    expect(resolved).toEqual({ defaultSize: 30, min: 0, max: 100, collapsible: undefined, collapseThreshold: undefined })
    expect(getMin(resolved)).toBe(0)
    expect(getMax(resolved)).toBe(100)
  })

  it('defaults max to the container in pixel mode', () => {
    const resolved = resolvePanel({ defaultSize: '240px' }, true, CONTAINER, ROOT_FONT)
    expect(resolved.max).toBe(CONTAINER)
    expect(getMax(resolved)).toBe(CONTAINER)
  })

  it('resolves declared bounds and keeps an undeclared threshold undefined', () => {
    const resolved = resolvePanel(
      { defaultSize: '240px', min: '100px', max: '300px', collapsible: true, collapseThreshold: '120px' },
      true,
      CONTAINER,
      ROOT_FONT,
    )
    expect(resolved.min).toBe(100)
    expect(resolved.max).toBe(300)
    expect(resolved.collapseThreshold).toBe(120)
    expect(resolved.collapsible).toBe(true)
  })

  it('falls back to min when no threshold is declared', () => {
    const withMin = resolvePanel({ defaultSize: 30, min: 10 }, false, CONTAINER, ROOT_FONT)
    const withoutMin = resolvePanel({ defaultSize: 30 }, false, CONTAINER, ROOT_FONT)
    expect(getCollapseThreshold(withMin)).toBe(10)
    expect(getCollapseThreshold(withoutMin)).toBe(0)
    expect(getMax({ defaultSize: 50 })).toBe(Infinity)
  })
})

describe('getFixedScale', () => {
  it('is 1 outside pixel mode and when nothing overflows', () => {
    expect(getFixedScale(['600px', '600px'], false, CONTAINER, ROOT_FONT)).toBe(1)
    expect(getFixedScale(['240px', 60], true, CONTAINER, ROOT_FONT)).toBe(1)
    expect(getFixedScale([50, 50], true, CONTAINER, ROOT_FONT)).toBe(1)
  })

  it('down-scales only the fixed panes of an overflowing layout', () => {
    expect(getFixedScale(['600px', '600px'], true, CONTAINER, ROOT_FONT)).toBeCloseTo(1000 / 1200)
    // A flexible pane never contributes to the overflow total.
    expect(getFixedScale(['1200px', 1], true, CONTAINER, ROOT_FONT)).toBeCloseTo(1000 / 1200)
  })
})

describe('resolveWorkingSizes', () => {
  it('is the identity mapping outside pixel mode', () => {
    expect(resolveWorkingSizes([30, '70%'], false, CONTAINER, ROOT_FONT)).toEqual([30, 70])
  })

  it('gives fixed panes their pixel size and shares the leftover between flexible ones', () => {
    // `240px` + `60` on a 1000px container: the fixed pane keeps 240 and the
    // flexible one takes the whole 760px leftover (it is the only flex weight).
    expect(resolveWorkingSizes(['240px', 60], true, CONTAINER, ROOT_FONT)).toEqual([240, 760])
    // Two flexible panes split the leftover by weight, not by container share.
    expect(resolveWorkingSizes(['240px', 50, 50], true, CONTAINER, ROOT_FONT)).toEqual([240, 380, 380])
  })

  it('collapses a squeezed flexible pane to 0 when the fixed panes overflow', () => {
    // `1200px` + weight 1 on a 1000px container: leftover 0, and the fixed pane
    // is scaled down to the container.
    expect(resolveWorkingSizes(['1200px', 1], true, CONTAINER, ROOT_FONT)).toEqual([1000, 0])
  })

  it('gives a zero-weight layout to the fixed panes rather than NaN', () => {
    expect(resolveWorkingSizes(['240px', 0], true, CONTAINER, ROOT_FONT)).toEqual([240, 0])
  })
})

describe('encodeSize', () => {
  it('keeps a percent string a percent string and everything else a number outside pixel mode', () => {
    expect(encodeSize(45, '50%', false, 0, ROOT_FONT)).toBe('45%')
    expect(encodeSize(45, 50, false, 0, ROOT_FONT)).toBe(45)
    expect(encodeSize(45, '240px', false, 0, ROOT_FONT)).toBe(45)
  })

  it('encodes a number or percent as a percent of the container in pixel mode', () => {
    // `updates the fixed pane in pixels and the flexible neighbor in percent on drag`:
    // 750 rendered px of a 1000px container is 75%.
    expect(encodeSize(750, 60, true, CONTAINER, ROOT_FONT)).toBeCloseTo(75)
    expect(encodeSize(750, '60%', true, CONTAINER, ROOT_FONT)).toBe('75%')
  })

  it('returns the declared number untouched when the container is unmeasured', () => {
    expect(encodeSize(750, 60, true, 0, ROOT_FONT)).toBe(60)
    expect(encodeSize(750, '60%', true, 0, ROOT_FONT)).toBe('60%')
  })

  it('converts a fixed pane back into its own unit, inverting the shrink-to-fit scale', () => {
    expect(encodeSize(250, '240px', true, CONTAINER, ROOT_FONT)).toBe('250px')
    expect(encodeSize(160, '10rem', true, CONTAINER, ROOT_FONT)).toBe('10rem')
    // 500 rendered px at scale 1000/1200 is 600 absolute px.
    expect(encodeSize(500, '600px', true, CONTAINER, ROOT_FONT, 1000 / 1200)).toBe('600px')
    expect(encodeSize(250, '10rem', true, CONTAINER, ROOT_FONT, 0.5)).toBe('31.25rem')
  })
})

describe('encodeWorkingSizes', () => {
  const raw = ['600px', '600px'] as const

  it('rewrites nothing when the working sizes did not move', () => {
    // `does not rewrite fixed sizes on a no-op drag when panes overflow the container`
    expect(encodeWorkingSizes([500, 500], [500, 500], [...raw], true, CONTAINER, ROOT_FONT)).toEqual(['600px', '600px'])
  })

  it('keeps the unscaled total when a real drag moves the handle', () => {
    // `does not shrink overflowing fixed panes on a real drag (keeps the unscaled total)`
    expect(encodeWorkingSizes([550, 450], [500, 500], [...raw], true, CONTAINER, ROOT_FONT)).toEqual(['660px', '540px'])
    // `does not shrink overflowing fixed panes on keyboard resize`
    expect(encodeWorkingSizes([510, 490], [500, 500], [...raw], true, CONTAINER, ROOT_FONT)).toEqual(['612px', '588px'])
  })

  it('re-encodes an untouched flexible pane once the overflow clears', () => {
    // `re-encodes untouched flex panes when a drag clears the overflow`: pane 0 is
    // a shrinking fixed pane, pane 1 a flex pane that never moved. Because the
    // overflow cleared, pane 1 must be re-encoded from its working size (its
    // share of the leftover) instead of keeping a stale weight.
    const next = encodeWorkingSizes([800, 200], [1000, 0], ['1200px', 1], true, CONTAINER, ROOT_FONT)
    expect(next[0]).toBe('800px')
    expect(next[1]).toBeCloseTo(20, 5)
  })

  it('re-encodes an untouched fixed pane when the overflow clears', () => {
    const next = encodeWorkingSizes([800, 200], [1000, 0], ['1200px', 1], true, CONTAINER, ROOT_FONT)
    expect(next[0]).not.toBe('1200px')
    expect(typeof next[0]).toBe('string')
  })

  it('leaves every raw value alone outside pixel mode when nothing moved', () => {
    expect(encodeWorkingSizes([30, 70], [30, 70], [30, '70%'], false, 0, ROOT_FONT)).toEqual([30, '70%'])
    expect(encodeWorkingSizes([40, 60], [30, 70], [30, '70%'], false, 0, ROOT_FONT)).toEqual([40, '60%'])
  })
})

describe('clamp and bound accessors', () => {
  it('clamps both ends inclusive', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('falls back for a hand-built resolved panel', () => {
    expect(getMin({ defaultSize: 50 })).toBe(0)
    expect(getMax({ defaultSize: 50 })).toBe(Infinity)
    expect(getCollapseThreshold({ defaultSize: 50 })).toBe(0)
    expect(getCollapseThreshold({ defaultSize: 50, min: 10, collapseThreshold: 4 })).toBe(4)
  })
})

describe('getCollapsed', () => {
  it('reports a panel collapsed only at a zero magnitude, whatever the unit', () => {
    expect(getCollapsed([0, 100])).toEqual([true, false])
    expect(getCollapsed(['0%', 100])).toEqual([true, false])
    expect(getCollapsed(['0px', '0rem', 100])).toEqual([true, true, false])
    expect(getCollapsed([30, 70])).toEqual([false, false])
  })
})

describe('checkCollapse', () => {
  it('snaps a shrinking collapsible before-panel to 0 and hands its size to the after-panel', () => {
    // With an explicit threshold of 10: 30 - 25 = 5 < 10 and 5 < 30, so the
    // before-panel collapses and the after-panel absorbs its previous 30.
    const withThreshold = panels([{ defaultSize: 30, collapsible: true, collapseThreshold: 10 }, { defaultSize: 70 }])
    expect(checkCollapse([30, 70], withThreshold, 0, -25)).toEqual([0, 100])
  })

  it('does not collapse when the threshold falls back to min 0', () => {
    // `getCollapseThreshold` falls back to `min`, and a bare `min: 0` cannot be
    // crossed by a shrinking panel: `rawBefore < 0` is false.
    const resolved = panels([{ defaultSize: 30, collapsible: true }, { defaultSize: 70 }])
    expect(checkCollapse([30, 70], resolved, 0, -25)).toBeNull()
  })

  it('snaps a shrinking collapsible after-panel to 0 and hands its size to the before-panel', () => {
    const resolved = panels([{ defaultSize: 70 }, { defaultSize: 30, collapsible: true, collapseThreshold: 10 }])
    expect(checkCollapse([70, 30], resolved, 0, 25)).toEqual([100, 0])
  })

  it('never collapses a panel that is growing through its threshold', () => {
    // `raw < sizes[...]` is the "must be shrinking" guard: a panel below its
    // threshold that the drag is growing stays put.
    const resolved = panels([{ defaultSize: 5, collapsible: true, collapseThreshold: 10 }, { defaultSize: 95 }])
    expect(checkCollapse([5, 95], resolved, 0, 2)).toBeNull()
  })

  it('never collapses a non-collapsible panel', () => {
    const resolved = panels([{ defaultSize: 30 }, { defaultSize: 70 }])
    expect(checkCollapse([30, 70], resolved, 0, -30)).toBeNull()
    expect(checkCollapse([30, 70], resolved, 0, 30)).toBeNull()
  })

  it('returns a fresh array rather than mutating its input', () => {
    const sizes = [30, 70]
    const resolved = panels([{ defaultSize: 30, collapsible: true, collapseThreshold: 10 }, { defaultSize: 70 }])
    const result = checkCollapse(sizes, resolved, 0, -25)!
    expect(sizes).toEqual([30, 70])
    expect(result).not.toBe(sizes)
  })

  it('prefers the before-panel when both sides are collapsible and both would cross', () => {
    const resolved = panels([
      { defaultSize: 10, collapsible: true, collapseThreshold: 20 },
      { defaultSize: 10, collapsible: true, collapseThreshold: 20 },
    ])
    // delta -5: before 5 < 20 and 5 < 10; after 15 < 20 but 15 > 10, so only the
    // before-panel qualifies and the first branch wins.
    expect(checkCollapse([10, 10], resolved, 0, -5)).toEqual([0, 20])
  })
})

describe('applyAdjacentOnly', () => {
  it('moves the handle while preserving the pair total', () => {
    const resolved = panels([{ defaultSize: 30 }, { defaultSize: 70 }])
    expect(applyAdjacentOnly([30, 70], resolved, 0, 10)).toEqual([40, 60])
    expect(applyAdjacentOnly([30, 70], resolved, 0, -10)).toEqual([20, 80])
  })

  it('clamps to the pair-and-other bounds rather than their independent bounds', () => {
    // before max 40 while the pair totals 100 and after min is 0: the pair can
    // realize before = 40, so a delta of +30 stops there.
    const resolved = panels([{ defaultSize: 30, max: 40 }, { defaultSize: 70, min: 0 }, { defaultSize: 0 }])
    expect(applyAdjacentOnly([30, 70, 0], resolved, 0, 30)).toEqual([40, 60, 0])
    // after min 50 caps before at 50.
    const minBound = panels([{ defaultSize: 30 }, { defaultSize: 70, min: 50 }])
    expect(applyAdjacentOnly([30, 70], minBound, 0, 90)).toEqual([50, 50])
  })

  it('does not mutate its input', () => {
    const sizes = [30, 70]
    applyAdjacentOnly(sizes, panels([{ defaultSize: 30 }, { defaultSize: 70 }]), 0, 10)
    expect(sizes).toEqual([30, 70])
  })
})

describe('redistributeNearest', () => {
  it('borrows from further panels when the neighbor is at min', () => {
    // Upstream: panels [26, 20 (min 20), 54], step 10 on handle 0 -> aria 36.
    const resolved = panels([{ defaultSize: 26 }, { defaultSize: 20, min: 20 }, { defaultSize: 54 }])
    expect(redistributeNearest([26, 20, 54], resolved, 0, 10)).toEqual([36, 20, 44])
  })

  it('borrows from the nearest panel first on a positive delta', () => {
    const resolved = panels([{ defaultSize: 20 }, { defaultSize: 30, min: 10 }, { defaultSize: 50, min: 10 }])
    expect(redistributeNearest([20, 30, 50], resolved, 0, 25)).toEqual([45, 10, 45])
  })

  it('borrows from the panels to the left on a negative delta', () => {
    const resolved = panels([{ defaultSize: 50, min: 10 }, { defaultSize: 20, min: 20 }, { defaultSize: 30 }])
    // handle 1, ArrowLeft, step 15: panel 2 grows from 30 to 45, drained leftwards.
    expect(redistributeNearest([50, 20, 30], resolved, 1, -15)).toEqual([35, 20, 45])
  })

  it('respects the growing panel max constraint', () => {
    const resolved = panels([{ defaultSize: 30, max: 40 }, { defaultSize: 20 }, { defaultSize: 50 }])
    // step 30, max 40: the grow is capped at 10 and only 10 is taken from panel 1.
    expect(redistributeNearest([30, 20, 50], resolved, 0, 30)).toEqual([40, 10, 50])
  })

  it('leaves the donors untouched when the growing panel is already at its max', () => {
    const resolved = panels([{ defaultSize: 40, max: 40 }, { defaultSize: 20 }, { defaultSize: 40 }])
    expect(redistributeNearest([40, 20, 40], resolved, 0, 30)).toEqual([40, 20, 40])
  })

  it('takes what it can when every donor runs out', () => {
    const resolved = panels([{ defaultSize: 40 }, { defaultSize: 0 }, { defaultSize: 60 }])
    expect(redistributeNearest([40, 0, 60], resolved, 0, 30)).toEqual([70, 0, 30])
  })

  it('preserves the total it was given', () => {
    const resolved = panels([{ defaultSize: 40 }, { defaultSize: 20 }, { defaultSize: 40 }])
    const before = [40, 20, 40]
    const after = redistributeNearest(before, resolved, 0, 30)
    expect(after.reduce((a, b) => a + b, 0)).toBeCloseTo(100)
    expect(before).toEqual([40, 20, 40])
  })
})

describe('redistributeEqual', () => {
  it('distributes shrinkage equally among the donor panels', () => {
    const resolved = panels([{ defaultSize: 20 }, { defaultSize: 40 }, { defaultSize: 40 }])
    expect(redistributeEqual([20, 40, 40], resolved, 0, 20)).toEqual([40, 30, 30])
  })

  it('skips donors at min and redistributes to the remaining', () => {
    const resolved = panels([{ defaultSize: 20 }, { defaultSize: 20, min: 20 }, { defaultSize: 60 }])
    expect(redistributeEqual([20, 20, 60], resolved, 0, 10)).toEqual([30, 20, 50])
  })

  it('drains an exhausted donor and spreads the remainder over the survivors', () => {
    const resolved = panels([{ defaultSize: 20 }, { defaultSize: 5 }, { defaultSize: 75 }])
    // Panel 1 can only give 5, so the remaining 15 comes from panel 2.
    expect(redistributeEqual([20, 5, 75], resolved, 0, 20)).toEqual([40, 0, 60])
  })

  it('drains both neighbors evenly on a negative delta, then the remainder', () => {
    // handle 1, delta -15, donors [1, 0]: 7.5 from each in the first sweep, then
    // panel 0's remaining need of 7.5 comes out of panel 1 — so the *after* panel
    // grows by 15 and both left panels lose 7.5.
    const resolved = panels([{ defaultSize: 40 }, { defaultSize: 40 }, { defaultSize: 20 }])
    expect(redistributeEqual([40, 40, 20], resolved, 1, -15)).toEqual([32.5, 32.5, 35])
  })

  it('distributes over the panels to the left on a negative delta', () => {
    const resolved = panels([{ defaultSize: 50, min: 10 }, { defaultSize: 20 }, { defaultSize: 30 }])
    // 7.5 each, so panel 0 loses 7.5 and panel 1 loses 7.5 before it grows.
    expect(redistributeEqual([50, 20, 30], resolved, 1, -15)).toEqual([42.5, 12.5, 45])
  })

  it('respects the growing panel max on both signs', () => {
    const resolved = panels([{ defaultSize: 30, max: 40 }, { defaultSize: 20 }, { defaultSize: 50 }])
    // The grow is capped at panel 0's max, but the trapped need is still spread
    // over the remaining donors with their per-donor share recomputed each sweep
    // (10 / 2 donors, then 5 from the one still standing).
    expect(redistributeEqual([30, 20, 50], resolved, 0, 30)).toEqual([40, 15, 45])
    // Negative delta grows panel 1, whose max is 30: the 10 it can take is drained
    // from panel 0, and panel 2 is untouched.
    const negative = panels([{ defaultSize: 50 }, { defaultSize: 20, max: 30 }, { defaultSize: 30 }])
    expect(redistributeEqual([50, 20, 30], negative, 0, -30)).toEqual([40, 30, 30])
  })

  it('leaves a fully drained layout alone when no donor can give', () => {
    const resolved = panels([{ defaultSize: 50 }, { defaultSize: 50, min: 50 }, { defaultSize: 0 }])
    expect(redistributeEqual([50, 50, 0], resolved, 0, 20)).toEqual([50, 50, 0])
  })
})

describe('applyConstraints: strategies', () => {
  const threePanels = panels([{ defaultSize: 20 }, { defaultSize: 30, min: 10 }, { defaultSize: 50, min: 10 }])

  it('uses only the adjacent pair when no strategy is configured', () => {
    // The pair clamp, not `redistributeNearest`: panel 0 grows by 25 but `total`
    // is 50 and panel 1 has min 10, so the pair caps the before-panel at 40.
    expect(applyConstraints([20, 30, 50], threePanels, 0, 25)).toEqual([40, 10, 50])
    // A step inside the pair's range moves only those two panels.
    expect(applyConstraints([20, 30, 50], threePanels, 0, 10)).toEqual([30, 20, 50])
  })

  it('routes to the nearest strategy', () => {
    expect(applyConstraints([20, 30, 50], threePanels, 0, 25, 'nearest')).toEqual([45, 10, 45])
  })

  it('does more for a negative delta than a mirrored positive one', () => {
    // The nearest/equal branches mint space from donors on the opposite side of
    // the handle, so the two directions are not mirror images: delta -25 grows
    // panel 1 by draining panel 0, not by shrinking panel 2.
    expect(applyConstraints([20, 30, 50], threePanels, 0, -25, 'nearest')).toEqual([0, 50, 50])
  })

  it('routes to the equal strategy', () => {
    const resolved = panels([{ defaultSize: 20 }, { defaultSize: 40 }, { defaultSize: 40 }])
    expect(applyConstraints([20, 40, 40], resolved, 0, 20, 'equal')).toEqual([40, 30, 30])
  })

  it('runs the collapse pass after a strategy squeeze', () => {
    // Panel 0 is pulled to 5, below its threshold of 10 and below its previous
    // 20, so the traded size goes to panel 1 rather than staying at 5.
    const resolved = panels([{ defaultSize: 20, collapsible: true, collapseThreshold: 10 }, { defaultSize: 80 }])
    expect(applyConstraints([20, 80], resolved, 0, -15, 'nearest')).toEqual([0, 100])
    expect(applyConstraints([20, 80], resolved, 0, -15, 'equal')).toEqual([0, 100])
  })

  it('does not collapse a panel that was already at 0 before the step', () => {
    // `result[i] < sizes[i]` is false for 0 < 0, so an already-collapsed pane is
    // not re-collapsed (and cannot hand its neighbour a phantom size).
    const resolved = panels([{ defaultSize: 0, collapsible: true, collapseThreshold: 10 }, { defaultSize: 100 }])
    expect(applyConstraints([0, 100], resolved, 0, 0, 'nearest')).toEqual([0, 100])
  })

  it('prefers the before-panel when both sides are collapsible', () => {
    const resolved = panels([
      { defaultSize: 20, collapsible: true, collapseThreshold: 10 },
      { defaultSize: 20, collapsible: true, collapseThreshold: 10 },
    ])
    expect(applyConstraints([20, 20], resolved, 0, -15, 'nearest')).toEqual([0, 40])
  })

  it('falls back to the adjacent-only path for an unknown strategy at runtime', () => {
    // A JS caller can pass anything. A string that is neither strategy skips the
    // strategy branch and reaches `checkCollapse` + `applyAdjacentOnly` — the
    // collapse check fires first and snaps the before-panel to 0 with no min/max
    // fold, which the strategy branch would have applied.
    const resolved = panels([{ defaultSize: 50, collapsible: true, collapseThreshold: 10 }, { defaultSize: 50 }])
    expect(applyConstraints([50, 50], resolved, 0, -45, 'nonsense' as any)).toEqual([0, 100])
  })
})

describe('applyConstraints: caller-supplied function', () => {
  const resolved = panels([{ defaultSize: 30 }, { defaultSize: 40, min: 40 }, { defaultSize: 30 }])

  it('receives a copy of the sizes, the resolved panels, the handle index and the delta', () => {
    const fn = vi.fn((input: { sizes: number[], delta: number }) => {
      const result = [...input.sizes]
      result[0] += input.delta
      result[2] -= input.delta
      return result
    })
    const sizes = [30, 40, 30]
    applyConstraints(sizes, resolved, 0, 5, fn)

    expect(fn).toHaveBeenCalledTimes(1)
    const input = fn.mock.calls[0][0] as any
    expect(input.sizes).toEqual([30, 40, 30])
    expect(input.handleIndex).toBe(0)
    expect(input.delta).toBe(5)
    expect(input.panels).toBe(resolved)
    // A copy: mutating what the callback was handed cannot corrupt the caller's array.
    expect(input.sizes).not.toBe(sizes)
  })

  it('uses the returned sizes verbatim, with no clamping or collapse pass', () => {
    // min of 40 on panel 1 and a total of 80 are both violated by the return
    // value, and upstream republishes it unchanged.
    expect(applyConstraints([30, 40, 30], resolved, 0, 5, () => [50, 10, 40])).toEqual([50, 10, 40])
  })

  it('skips the collapse check that the adjacent-only path would run', () => {
    const collapsible = panels([{ defaultSize: 50, collapsible: true, collapseThreshold: 10 }, { defaultSize: 50 }])
    expect(applyConstraints([50, 50], collapsible, 0, -45, () => [5, 95])).toEqual([5, 95])
  })
})

describe('resetAdjacentSizes', () => {
  it('restores the adjacent pair to their default ratio, preserving their combined size', () => {
    // `reset(handleIndex) restores adjacent panels to their default ratio and
    // leaves other panels untouched`: defaults 20:30, combined 30 -> 12/18.
    const resolved = panels([{ defaultSize: 20 }, { defaultSize: 30 }, { defaultSize: 50 }])
    expect(resetAdjacentSizes([10, 20, 70], resolved, 0)).toEqual([12, 18, 70])
  })

  it('clamps the restored pair to their min constraints', () => {
    // `reset clamps adjacent panels to their min constraints`: the ratio would
    // put panel 0 at 15, but panel 1 must keep its min of 50.
    const resolved = panels([{ defaultSize: 20 }, { defaultSize: 60, min: 50 }, { defaultSize: 20 }])
    expect(resetAdjacentSizes([55, 5, 40], resolved, 0)).toEqual([10, 50, 40])
  })

  it('leaves the pair alone when it is already at its default ratio', () => {
    const resolved = panels([{ defaultSize: 20 }, { defaultSize: 30 }, { defaultSize: 50 }])
    expect(resetAdjacentSizes([20, 30, 50], resolved, 0)).toEqual([20, 30, 50])
  })

  it('splits the pair evenly when both defaults are 0', () => {
    // A zero default total has no ratio to restore; upstream falls back to half.
    const resolved = panels([{ defaultSize: 0 }, { defaultSize: 0 }, { defaultSize: 100 }])
    expect(resetAdjacentSizes([10, 30, 60], resolved, 0)).toEqual([20, 20, 60])
  })

  it('touches only the pair adjacent to the given handle', () => {
    const resolved = panels([{ defaultSize: 20 }, { defaultSize: 30 }, { defaultSize: 50 }])
    // Reset at handle 1 restores panels 1 and 2: the pair totals 100 and its
    // defaults are 30:50, so it becomes [37.5, 62.5] and panel 0 keeps its 50
    // exactly. (The ratio is the panels' *declared defaults*, not the pair's
    // current sizes — the pair total is what is preserved.)
    expect(resetAdjacentSizes([50, 10, 90], resolved, 1)).toEqual([50, 37.5, 62.5])
    const middle = resetAdjacentSizes([10, 20, 70], resolved, 1)
    expect(middle[0]).toBe(10)
    expect(middle[1] + middle[2]).toBe(90)
  })

  it('returns a copy and does nothing for an out-of-range handle', () => {
    const resolved = panels([{ defaultSize: 20 }, { defaultSize: 80 }])
    const sizes = [20, 80]
    expect(resetAdjacentSizes(sizes, resolved, -1)).toEqual([20, 80])
    expect(resetAdjacentSizes(sizes, resolved, 1)).toEqual([20, 80])
    expect(resetAdjacentSizes(sizes, resolved, -1)).not.toBe(sizes)
  })

  it('runs on working pixel sizes, keeping the pair total the container can render', () => {
    // In pixel mode the caller hands `resetAdjacentSizes` the *working* sizes
    // (`resolveWorkingSizes`), i.e. post-shrink-to-fit pixels, so the pair total
    // is what those panes actually occupy. A 1:1 pair therefore stays put.
    const even = panels([{ defaultSize: 600 }, { defaultSize: 600 }])
    expect(resetAdjacentSizes([500, 500], even, 0)).toEqual([500, 500])
    // A skewed working pair of unequal declared sizes returns to the declared
    // ratio at the same total: 1:3 of 800 working px.
    const uneven = panels([{ defaultSize: 200 }, { defaultSize: 600 }])
    expect(resetAdjacentSizes([300, 500], uneven, 0)).toEqual([200, 600])
  })

  it('folds the reset target through the pair clamp, so the pair bounds cap it', () => {
    const noCap = panels([{ defaultSize: 200 }, { defaultSize: 600 }])
    expect(resetAdjacentSizes([500, 500], noCap, 0)).toEqual([250, 750])
    // With a min that bites, the before-panel takes only what the after-panel's
    // bound leaves it: the 1:3 ratio wants 250, panel 1's min 800 allows 200.
    const bounded = pixelPanels(CONTAINER, [{ defaultSize: 200 }, { defaultSize: 600, min: 800 }])
    expect(resetAdjacentSizes([500, 500], bounded, 0)).toEqual([200, 800])
  })
})

// ---------------------------------------------------------------------------
// The hook itself. Everything below needs a rendered tree; the pure halves above
// need nothing.
// ---------------------------------------------------------------------------

/**
 * Wrapper size the layouts below are rendered into. The percentage math in the
 * tests assumes exactly this width, so the drag tests assert it rather than
 * trusting the ambient viewport.
 */
const HARNESS_WIDTH = 1000
const HARNESS_HEIGHT = 600

/**
 * Panel style: a flexible pane contributes its declared unit as `flexGrow`, a
 * fixed pane contributes its pixel size as `flexBasis`. This is the same
 * `flex-grow` contract `resolveWorkingSizes` documents, so what the tests
 * measure is what a consumer would render.
 */
function paneStyle(size: SplitterPaneSize): React.CSSProperties {
  const isFixed = typeof size === 'string' && (size.endsWith('px') || size.endsWith('rem'))
  return isFixed ? { flexBasis: size, flexGrow: 0 } : { flexGrow: Number(size) }
}

/**
 * The browser-mode port of upstream's `TestComponent`/`UnitHarness`: renders the
 * container plus one handle per gap, and exposes the latest hook value so a test
 * can drive `collapse`/`expand`/`reset`/`setSizes` directly.
 */
function Harness({
  options,
  splitter,
}: {
  options: UseSplitterOptions
  splitter: React.RefObject<UseSplitterReturnValue<HTMLDivElement> | undefined>
}) {
  const result = useSplitter<HTMLDivElement>(options)
  splitter.current = result

  return (
    <div
      ref={result.ref}
      data-testid="container"
      style={{ width: HARNESS_WIDTH, height: HARNESS_HEIGHT, display: 'flex' }}
    >
      {result.sizes.map((size, index) => (
        <div key={`pane-${index}`} data-testid={`pane-${index}`} style={paneStyle(size)} />
      ))}
      {result.sizes.slice(0, -1).map((_, index) => (
        <div key={`handle-${index}`} data-testid={`handle-${index}`} {...result.getHandleProps({ index })} />
      ))}
    </div>
  )
}

/** Mutable holder for the latest hook value, so tests read it after a render. */
function splitterRef(): React.RefObject<UseSplitterReturnValue<HTMLDivElement> | undefined> {
  return { current: undefined }
}

/** `act` as `vitest-browser-react` hands it out (from `render`/`renderHook`). */
type Act = (callback: () => unknown) => Promise<void>

/**
 * `vitest-browser-react` 2.3's `render()` does **not** return an `act` (only
 * `renderHook()` does), and the promise it resolves with is not itself a usable
 * act, so the `render`-based tests use React's own `act` instead. That is the
 * same batching mechanism either way: the DOM listeners below commit their state
 * outside any React event handler, so without a flush the assertion reads the
 * pre-event DOM.
 */
const act: Act = callback => reactAct(async () => {
  await callback()
})

function handleEl(index: number): HTMLElement {
  const el = document.querySelector(`[data-testid="handle-${index}"]`)
  if (!(el instanceof HTMLElement)) {
    throw new TypeError(`handle-${index} is not rendered`)
  }
  return el
}

function containerEl(): HTMLElement {
  const el = document.querySelector('[data-testid="container"]')
  if (!(el instanceof HTMLElement)) {
    throw new TypeError('container is not rendered')
  }
  return el
}

/**
 * Dispatch a real keydown on a handle and flush the React update it schedules.
 *
 * The flush is not optional: the handler runs from a `keydown` listener that
 * React delegates at the root, so the state update it commits is batched until
 * the ambient act scope ends. Asserting straight afterwards reads the pre-key
 * `aria-valuenow` — the exact false negative that failed 29 tests on the first
 * run of this half.
 */
async function keydownOn(act: Act, handleIndex: number, key: string, shiftKey = false): Promise<HTMLElement> {
  const el = handleEl(handleIndex)
  await act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }))
  })
  return el
}

/** Point `getBoundingClientRect` at a fixed size for the duration of `fn`. */
async function withRect<R>(
  el: HTMLElement,
  size: { width: number, height: number },
  fn: () => Promise<R>,
): Promise<R> {
  const original = el.getBoundingClientRect
  el.getBoundingClientRect = () => ({
    width: size.width,
    height: size.height,
    top: 0,
    left: 0,
    right: size.width,
    bottom: size.height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect
  try {
    return await fn()
  }
  finally {
    el.getBoundingClientRect = original
  }
}

/**
 * Drag `handleIndex` by `deltaX` pixels.
 *
 * The listeners live on `document` (attached at `pointerdown`), so the events
 * are dispatched there rather than through the playwright mouse API: `page` is
 * not a global in this project's browser setup, and a synthetic `PointerEvent`
 * with explicit `clientX/clientY` makes the delta exactly what the test says it
 * is instead of depending on the handle's on-screen position. `pointerup` is
 * what flushes the drag — `pointermove` only schedules a
 * `requestAnimationFrame`.
 */
async function dragHandle(act: Act, handleIndex: number, deltaX: number, fromX = 100): Promise<void> {
  const handle = handleEl(handleIndex)
  const rect = handle.getBoundingClientRect()
  const y = rect.top + rect.height / 2 || 50

  await act(() => {
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: fromX, clientY: y }))
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: fromX + deltaX, clientY: y }))
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: fromX + deltaX, clientY: y }))
  })
}

describe('useSplitter: initial state and props', () => {
  it('returns the declared default sizes, no collapsed panels and no active handle', async () => {
    const { result } = await renderHook(() => useSplitter({ panels: [{ defaultSize: 30 }, { defaultSize: 70 }] }))

    expect(result.current.sizes).toEqual([30, 70])
    expect(result.current.collapsed).toEqual([false, false])
    expect(result.current.activeHandle).toBe(-1)
    expect(result.current.pixelMode).toBe(false)
  })

  it('returns handle props with correct ARIA attributes', async () => {
    const { result } = await renderHook(() =>
      useSplitter({ panels: [{ defaultSize: 50, min: 10, max: 80 }, { defaultSize: 50 }] }),
    )

    const props = result.current.getHandleProps({ index: 0 })
    expect(props.role).toBe('separator')
    expect(props['aria-orientation']).toBe('horizontal')
    expect(props['aria-valuenow']).toBe(50)
    expect(props['aria-valuemin']).toBe(10)
    expect(props['aria-valuemax']).toBe(80)
    expect(props.tabIndex).toBe(0)
    expect(props['data-orientation']).toBe('horizontal')
    expect(props['data-active']).toBeUndefined()
  })

  it('returns vertical aria-orientation when orientation is vertical', async () => {
    const { result } = await renderHook(() =>
      useSplitter({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], orientation: 'vertical' }),
    )

    const props = result.current.getHandleProps({ index: 0 })
    expect(props['aria-orientation']).toBe('vertical')
    expect(props['data-orientation']).toBe('vertical')
  })

  it('marks only the dragged handle active', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }} splitter={splitter} />,
    )

    expect(splitter.current!.getHandleProps({ index: 0 })['data-active']).toBeUndefined()

    const el = handleEl(0)
    const rect = el.getBoundingClientRect()
    await act(() => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: rect.top + 1 }))
    })
    expect(splitter.current!.getHandleProps({ index: 0 })['data-active']).toBe(true)

    await act(() => {
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 100, clientY: rect.top + 1 }))
    })
    expect(splitter.current!.activeHandle).toBe(-1)
    expect(splitter.current!.getHandleProps({ index: 0 })['data-active']).toBeUndefined()
  })
})

describe('useSplitter: programmatic state', () => {
  it('sets sizes programmatically and marks the collapsed panels', async () => {
    const { result, act } = await renderHook(() => useSplitter({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }))

    await act(() => {
      result.current.setSizes([30, 70])
    })

    expect(result.current.sizes).toEqual([30, 70])

    await act(() => {
      result.current.setSizes([0, 100])
    })
    expect(result.current.collapsed).toEqual([true, false])
  })

  it('does not collapse a panel that is not marked collapsible', async () => {
    const { result, act } = await renderHook(() => useSplitter({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }))

    await act(() => {
      result.current.collapse(0)
    })

    expect(result.current.sizes).toEqual([50, 50])
  })

  it('collapses a collapsible panel and reports it once', async () => {
    const onCollapseChange = vi.fn()
    const { result, act } = await renderHook(() =>
      useSplitter({ panels: [{ defaultSize: 30, collapsible: true }, { defaultSize: 70 }], onCollapseChange }),
    )

    await act(() => {
      result.current.collapse(0)
    })

    expect(result.current.sizes[0]).toBe(0)
    expect(result.current.sizes[1]).toBe(100)
    expect(result.current.collapsed).toEqual([true, false])
    expect(onCollapseChange).toHaveBeenCalledWith(0, true)
  })

  it('expands a collapsed panel back to its pre-collapse size, reporting it once', async () => {
    const onCollapseChange = vi.fn()
    const { result, act } = await renderHook(() =>
      useSplitter({ panels: [{ defaultSize: 30, collapsible: true }, { defaultSize: 70 }], onCollapseChange }),
    )

    await act(() => {
      result.current.collapse(0)
    })
    expect(result.current.sizes).toEqual([0, 100])

    await act(() => {
      result.current.expand(0)
    })

    expect(result.current.sizes).toEqual([30, 70])
    expect(result.current.collapsed).toEqual([false, false])
    expect(onCollapseChange).toHaveBeenLastCalledWith(0, false)
  })

  it('does not expand, and does not report, when there is nothing to restore', async () => {
    // Pixel mode has no measured container inside `renderHook` (there is no
    // element for the ResizeObserver to observe), so every working size resolves
    // to 0: the collapse has no size to hand over and expands nothing. Both panels
    // stay put and no transition is reported.
    const onCollapseChange = vi.fn()
    const { result, act } = await renderHook(() =>
      useSplitter({
        panels: [{ defaultSize: '120px', collapsible: true }, { defaultSize: 0, min: '100px' }],
        onCollapseChange,
      }),
    )

    expect(result.current.sizes).toEqual(['120px', 0])

    await act(() => {
      result.current.collapse(0)
    })
    expect(result.current.sizes[0]).toBe('0px')

    onCollapseChange.mockClear()
    await act(() => {
      result.current.expand(0)
    })

    // Nothing was available, so the hook bailed: no size, no report.
    expect(result.current.sizes.every(size => sizeMagnitude(size) >= 0)).toBe(true)
    expect(onCollapseChange).not.toHaveBeenCalled()
  })

  it('round-trips a collapse and expand in flexible mode', async () => {
    const onCollapseChange = vi.fn()
    const { result, act } = await renderHook(() =>
      useSplitter({
        panels: [{ defaultSize: 30, collapsible: true }, { defaultSize: 100, min: 100 }],
        onCollapseChange,
      }),
    )

    await act(() => {
      result.current.collapse(0)
    })
    // Panel 1 takes panel 0's whole share; its min is satisfied by construction.
    expect(result.current.sizes).toEqual([0, 130])

    onCollapseChange.mockClear()
    await act(() => {
      result.current.expand(0)
    })

    expect(result.current.sizes).toEqual([30, 100])
    expect(onCollapseChange).toHaveBeenCalledWith(0, false)
  })

  it('toggles a panel through collapse and back', async () => {
    const onCollapseChange = vi.fn()
    const { result, act } = await renderHook(() =>
      useSplitter({ panels: [{ defaultSize: 40, collapsible: true }, { defaultSize: 60 }], onCollapseChange }),
    )

    await act(() => {
      result.current.toggleCollapse(0)
    })
    // The toggle has to route to `collapse`: a panel is collapsed exactly when its
    // size is 0, and `collapsed` is derived from the sizes rather than tracked.
    expect(result.current.collapsed[0]).toBe(true)
    expect(result.current.sizes).toEqual([0, 100])
    expect(onCollapseChange).toHaveBeenLastCalledWith(0, true)

    await act(() => {
      result.current.toggleCollapse(0)
    })
    expect(result.current.collapsed[0]).toBe(false)
    expect(result.current.sizes).toEqual([40, 60])
    expect(onCollapseChange).toHaveBeenLastCalledWith(0, false)
  })

  it('calls onSizeChange in controlled mode', async () => {
    const onSizeChange = vi.fn()
    const { result, act } = await renderHook(() =>
      useSplitter({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], sizes: [50, 50], onSizeChange }),
    )

    await act(() => {
      result.current.setSizes([20, 80])
    })

    expect(onSizeChange).toHaveBeenCalledWith([20, 80])
    // Controlled: the rendered sizes are the caller's, which this test never
    // updates, so the hook must not have moved them on its own.
    expect(result.current.sizes).toEqual([50, 50])
  })

  it('treats an undefined controlled value as uncontrolled', async () => {
    // The distinction the internal control helper exists for: `sizes: undefined`
    // is uncontrolled, so writes commit locally instead of vanishing into a
    // caller that will never send a new value back.
    const onSizeChange = vi.fn()
    const { result, act } = await renderHook(() =>
      useSplitter({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], sizes: undefined, onSizeChange }),
    )

    await act(() => {
      result.current.setSizes([20, 80])
    })

    expect(result.current.sizes).toEqual([20, 80])
    expect(onSizeChange).toHaveBeenCalledWith([20, 80])
  })

  it('follows the caller when a controlled value changes', async () => {
    const props: { sizes: SplitterPaneSize[] } = { sizes: [50, 50] }
    const { result, rerender } = await renderHook(
      (initial?: { sizes: SplitterPaneSize[] }) =>
        useSplitter({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], sizes: (initial ?? props).sizes }),
      { initialProps: props },
    )

    expect(result.current.sizes).toEqual([50, 50])

    await rerender({ sizes: [10, 90] })
    expect(result.current.sizes).toEqual([10, 90])
  })
})

describe('useSplitter: keyboard navigation', () => {
  it('grows the before panel on ArrowRight and shrinks it on ArrowLeft', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], step: 5 }} splitter={splitter} />,
    )

    await keydownOn(act, 0, 'ArrowRight')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('55')

    await keydownOn(act, 0, 'ArrowLeft')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('50')
  })

  it('uses shiftStep for a shifted arrow', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], step: 1, shiftStep: 10 }} splitter={splitter} />,
    )

    await keydownOn(act, 0, 'ArrowRight', true)
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('60')
  })

  it('honours a custom step and shiftStep', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], step: 7, shiftStep: 21 }} splitter={splitter} />,
    )

    await keydownOn(act, 0, 'ArrowRight')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('57')

    await keydownOn(act, 0, 'ArrowRight', true)
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('78')
  })

  it('shrinks to min on Home and grows to max on End', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50, min: 20, max: 80 }, { defaultSize: 50 }] }} splitter={splitter} />,
    )

    await keydownOn(act, 0, 'Home')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('20')

    await keydownOn(act, 0, 'End')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('80')
  })

  it('respects min/max constraints during keyboard navigation', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: 50, min: 40, max: 60 }, { defaultSize: 50 }], step: 30 }}
        splitter={splitter}
      />,
    )

    await keydownOn(act, 0, 'ArrowRight')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('60')

    // The step overshoots panel 0's own `min` of 40; the pair clamp — with panel
    // 1's min at its default 0 — is what stops it there.
    await keydownOn(act, 0, 'ArrowLeft')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('40')

    // Already at the floor: another step cannot move it.
    await keydownOn(act, 0, 'ArrowLeft')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('40')
  })

  it('inverts the horizontal arrows under dir: rtl', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], step: 5, dir: 'rtl' }} splitter={splitter} />,
    )

    await keydownOn(act, 0, 'ArrowLeft')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('55')

    await keydownOn(act, 0, 'ArrowRight')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('50')
  })

  it('uses up/down on the vertical axis', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], orientation: 'vertical', step: 5 }} splitter={splitter} />,
    )

    await keydownOn(act, 0, 'ArrowDown')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('55')

    await keydownOn(act, 0, 'ArrowUp')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('50')
  })

  it('ignores the wrong axis without preventing default, so the page can still scroll', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], orientation: 'vertical', step: 5 }} splitter={splitter} />,
    )

    const el = handleEl(0)
    let accepted = true
    await act(() => {
      accepted = el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }))
    })

    // `dispatchEvent` returns false only when a handler called preventDefault.
    expect(accepted).toBe(true)
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('50')
  })

  it('ignores keyboard input when disabled', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], step: 5, enabled: false }} splitter={splitter} />,
    )

    await keydownOn(act, 0, 'ArrowRight')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('50')
  })

  it('toggles collapse on Enter, preferring the smaller collapsible panel', async () => {
    const onCollapseChange = vi.fn()
    const splitter = splitterRef()
    await render(
      <Harness
        options={{
          panels: [{ defaultSize: 30, collapsible: true }, { defaultSize: 70, collapsible: true }],
          onCollapseChange,
        }}
        splitter={splitter}
      />,
    )

    await keydownOn(act, 0, 'Enter')

    // 30 <= 70 and panel 0 is collapsible, so panel 0 is the one that collapses.
    expect(onCollapseChange).toHaveBeenCalledWith(0, true)
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('0')
  })

  it('collapses the after panel on Enter when only the after panel is collapsible', async () => {
    const onCollapseChange = vi.fn()
    const splitter = splitterRef()
    await render(
      <Harness
        options={{
          panels: [{ defaultSize: 70 }, { defaultSize: 30, collapsible: true }],
          onCollapseChange,
        }}
        splitter={splitter}
      />,
    )

    await keydownOn(act, 0, 'Enter')

    expect(onCollapseChange).toHaveBeenCalledWith(1, true)
  })

  it('does not respond to Enter when neither side is collapsible', async () => {
    const onCollapseChange = vi.fn()
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], onCollapseChange }}
        splitter={splitter}
      />,
    )

    await keydownOn(act, 0, 'Enter')
    expect(onCollapseChange).not.toHaveBeenCalled()
  })

  it('fires onCollapseChange when a keyboard step collapses a panel', async () => {
    const onCollapseChange = vi.fn()
    const splitter = splitterRef()
    await render(
      <Harness
        options={{
          panels: [{ defaultSize: 10, collapsible: true, collapseThreshold: 5 }, { defaultSize: 90 }],
          step: 20,
          onCollapseChange,
        }}
        splitter={splitter}
      />,
    )

    await keydownOn(act, 0, 'ArrowLeft')

    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('0')
    expect(onCollapseChange).toHaveBeenCalledWith(0, true)
  })

  it('keeps the sizes summing to the container when a min constrains the step', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50, min: 45 }], step: 30, redistribute: 'nearest' }}
        splitter={splitter}
      />,
    )

    await keydownOn(act, 0, 'ArrowRight')

    const sizes = splitter.current!.sizes.map(Number)
    expect(sizes.reduce((a, b) => a + b, 0)).toBeCloseTo(100)
    expect(sizes[1]).toBeGreaterThanOrEqual(45)
  })
})

describe('useSplitter: pointer drag', () => {
  it('moves the adjacent pair by the pointer delta between two flexible panes', async () => {
    const onResizeStart = vi.fn()
    const onResizeEnd = vi.fn()
    const splitter = splitterRef()
    await render(
      <Harness
        options={{
          panels: [{ defaultSize: 30 }, { defaultSize: 70 }],
          onResizeStart,
          onResizeEnd,
        }}
        splitter={splitter}
      />,
    )

    expect(splitter.current!.sizes).toEqual([30, 70])
    expect(containerEl().getBoundingClientRect().width).toBe(HARNESS_WIDTH)

    await dragHandle(act, 0, 50)

    // +50px of a 1000px container is +5 percentage points.
    expect(onResizeStart).toHaveBeenCalledWith(0)
    expect(Number(splitter.current!.sizes[0])).toBeCloseTo(35)
    expect(Number(splitter.current!.sizes[1])).toBeCloseTo(65)
    expect(onResizeEnd).toHaveBeenCalled()
    expect(onResizeEnd.mock.calls[0][0]).toBe(0)
    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
  })

  it('leaves the sizes alone when the container has not been measured', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }} splitter={splitter} />,
    )

    await withRect(containerEl(), { width: 0, height: 0 }, () => dragHandle(act, 0, 50))

    expect(splitter.current!.sizes).toEqual([50, 50])
  })

  it('cleans up the body styles when unmounted during an active drag', async () => {
    const splitter = splitterRef()
    const { unmount } = await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }} splitter={splitter} />,
    )

    const el = handleEl(0)
    const rect = el.getBoundingClientRect()
    await act(() => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: rect.top + 1 }))
    })
    expect(document.body.style.cursor).toBe('col-resize')
    expect(document.body.style.userSelect).toBe('none')

    await unmount()

    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
  })

  it('uses a row-resize cursor on the vertical axis', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], orientation: 'vertical' }} splitter={splitter} />,
    )

    const el = handleEl(0)
    const rect = el.getBoundingClientRect()
    await act(() => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: rect.top + 1 }))
    })
    expect(document.body.style.cursor).toBe('row-resize')

    await act(() => {
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 100, clientY: rect.top + 1 }))
    })
    expect(document.body.style.cursor).toBe('')
  })

  it('ignores a disabled hook', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], enabled: false }} splitter={splitter} />,
    )

    const el = handleEl(0)
    const rect = el.getBoundingClientRect()
    await act(() => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: rect.top + 1 }))
    })

    expect(splitter.current!.activeHandle).toBe(-1)
    expect(document.body.style.cursor).toBe('')
  })

  it('ignores a non-primary button', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }} splitter={splitter} />,
    )

    const el = handleEl(0)
    const rect = el.getBoundingClientRect()
    await act(() => {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2, clientX: 100, clientY: rect.top + 1 }))
    })

    expect(splitter.current!.activeHandle).toBe(-1)
    expect(document.body.style.cursor).toBe('')
  })

  it('uses the redistribute function during a drag', async () => {
    const customFn = vi.fn((input: { sizes: number[], delta: number }) => {
      const next = [...input.sizes]
      next[0] += input.delta
      next[1] -= input.delta
      return next
    })
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: 50 }, { defaultSize: 50 }], redistribute: customFn }}
        splitter={splitter}
      />,
    )

    await dragHandle(act, 0, 40)

    expect(customFn).toHaveBeenCalled()
    const input = customFn.mock.calls[0][0]
    expect(input.sizes).toEqual([50, 50])
    expect(input.delta).toBeCloseTo(4)
    expect(Number(splitter.current!.sizes[0])).toBeCloseTo(54)
  })

  it('spreads a drag across the donors with redistribute: equal', async () => {
    // The `'equal'` strategy reached through the drag path is a distinct call
    // shape from the keyboard one: the drag feeds `applyConstraints` *working*
    // sizes (which may be pixels) and a delta derived from the pointer.
    const splitter = splitterRef()
    await render(
      <Harness
        options={{
          panels: [{ defaultSize: 20 }, { defaultSize: 40 }, { defaultSize: 40 }],
          redistribute: 'equal',
        }}
        splitter={splitter}
      />,
    )

    await dragHandle(act, 0, 20)

    // +20px of a 1000px container is +2 percentage points, spread equally over
    // the two donors: 22 / 39 / 39.
    expect(Number(splitter.current!.sizes[0])).toBeCloseTo(22)
    expect(Number(splitter.current!.sizes[1])).toBeCloseTo(39)
    expect(Number(splitter.current!.sizes[2])).toBeCloseTo(39)
  })

  it('reports a collapse when a drag crosses the threshold', async () => {
    // The drag's collapse-transition reporting is its own code path (the
    // keyboard path has its own): a panel that snaps to 0 mid-drag must fire
    // `onCollapseChange` exactly once, and a drag that never crosses must not
    // fire it at all.
    const onCollapseChange = vi.fn()
    const splitter = splitterRef()
    await render(
      <Harness
        options={{
          panels: [{ defaultSize: 20, collapsible: true, collapseThreshold: 10 }, { defaultSize: 80 }],
          onCollapseChange,
        }}
        splitter={splitter}
      />,
    )

    // 15px is 1.5 points: 20 -> 18.5, well above the threshold of 10.
    await dragHandle(act, 0, -15, 300)
    expect(onCollapseChange).not.toHaveBeenCalled()
    expect(Number(splitter.current!.sizes[0])).toBeCloseTo(18.5)

    // A second drag grabs the handle at its new position and crosses the
    // threshold, snapping panel 0 to 0.
    await dragHandle(act, 0, -900, 300)
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('0')
    expect(splitter.current!.collapsed).toEqual([true, false])
    expect(onCollapseChange).toHaveBeenCalledTimes(1)
    expect(onCollapseChange).toHaveBeenCalledWith(0, true)
  })

  it('reports an expand when a drag pulls a collapsed panel back out', async () => {
    // The mirror transition: the panel starts collapsed (size 0), the drag grows
    // it past the threshold, and the hook reports `false` once.
    const onCollapseChange = vi.fn()
    const splitter = splitterRef()
    await render(
      <Harness
        options={{
          panels: [{ defaultSize: 0, collapsible: true, collapseThreshold: 10 }, { defaultSize: 100 }],
          onCollapseChange,
        }}
        splitter={splitter}
      />,
    )

    expect(splitter.current!.collapsed).toEqual([true, false])

    await dragHandle(act, 0, 150)

    expect(Number(splitter.current!.sizes[0])).toBeCloseTo(15)
    expect(splitter.current!.collapsed).toEqual([false, false])
    expect(onCollapseChange).toHaveBeenCalledTimes(1)
    expect(onCollapseChange).toHaveBeenCalledWith(0, false)
  })
})

describe('useSplitter: reset', () => {
  it('restores the adjacent pair to their default ratio and leaves other panels untouched', async () => {
    const { result, act } = await renderHook(() =>
      useSplitter({ panels: [{ defaultSize: 20 }, { defaultSize: 30 }, { defaultSize: 50 }] }),
    )

    await act(() => {
      result.current.setSizes([10, 20, 70])
    })
    await act(() => {
      result.current.reset(0)
    })

    expect(result.current.sizes).toEqual([12, 18, 70])
  })

  it('clamps the restored pair to their min constraints', async () => {
    const { result, act } = await renderHook(() =>
      useSplitter({ panels: [{ defaultSize: 20 }, { defaultSize: 60, min: 50 }, { defaultSize: 20 }] }),
    )

    await act(() => {
      result.current.setSizes([55, 5, 40])
    })
    await act(() => {
      result.current.reset(0)
    })

    expect(result.current.sizes).toEqual([10, 50, 40])
  })

  it('does nothing for an out-of-range handle index', async () => {
    const { result, act } = await renderHook(() => useSplitter({ panels: [{ defaultSize: 50 }, { defaultSize: 50 }] }))

    await act(() => {
      result.current.reset(1)
    })
    expect(result.current.sizes).toEqual([50, 50])
  })

  it('resets on handle double-click', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: 20 }, { defaultSize: 30 }, { defaultSize: 50 }] }} splitter={splitter} />,
    )

    for (let i = 0; i < 4; i += 1) {
      await keydownOn(act, 0, 'ArrowRight')
    }
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('24')

    await act(() => {
      handleEl(0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('20')
  })

  it('does not reset on double-click when resetOnDoubleClick is false', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: 20 }, { defaultSize: 30 }, { defaultSize: 50 }], resetOnDoubleClick: false }}
        splitter={splitter}
      />,
    )

    for (let i = 0; i < 4; i += 1) {
      await keydownOn(act, 0, 'ArrowRight')
    }
    const before = handleEl(0).getAttribute('aria-valuenow')

    await act(() => {
      handleEl(0).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe(before)
  })
})

describe('useSplitter: CSS units', () => {
  it('preserves declared units in the returned sizes', async () => {
    const { result } = await renderHook(() =>
      useSplitter({ panels: [{ defaultSize: '240px' }, { defaultSize: 60 }] }),
    )

    expect(result.current.sizes).toEqual(['240px', 60])
    expect(result.current.pixelMode).toBe(true)
  })

  it('reports a fixed pane size through aria-valuenow', async () => {
    const splitter = splitterRef()
    await render(<Harness options={{ panels: [{ defaultSize: '240px' }, { defaultSize: 60 }] }} splitter={splitter} />)

    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('240')
    expect(splitter.current!.sizes).toEqual(['240px', 60])
  })

  it('resolves rem sizes against the document root font size', async () => {
    const splitter = splitterRef()
    await render(<Harness options={{ panels: [{ defaultSize: '10rem' }, { defaultSize: 50 }] }} splitter={splitter} />)

    // The root font size is measured, not assumed: 10rem must equal 10x it.
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe(String(Math.round(10 * rootFontSize)))
  })

  it('applies a pixel keyboard step to a fixed pane', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: '240px' }, { defaultSize: 60, min: 0 }], step: '10px' }}
        splitter={splitter}
      />,
    )

    await keydownOn(act, 0, 'ArrowRight')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('250')
  })

  it('treats a bare-number step as a percentage of the container in pixel mode', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: '240px' }, { defaultSize: 60, min: 0 }], step: 1 }}
        splitter={splitter}
      />,
    )

    // panel 0 declares `240px`, so pixel mode is on and 1 means 1% of 1000px.
    await keydownOn(act, 0, 'ArrowRight')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('250')
  })

  it('clamps a fixed pane to its pixel max', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: '240px', max: '300px' }, { defaultSize: 60, min: 0 }], step: '100px' }}
        splitter={splitter}
      />,
    )

    await keydownOn(act, 0, 'ArrowRight')
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('300')
  })

  it('enables pixel mode when only collapseThreshold uses a fixed unit', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: 30, collapsible: true, collapseThreshold: '120px' }, { defaultSize: 70 }] }}
        splitter={splitter}
      />,
    )

    // A bare 30 is 30% of the 1000px container.
    expect(handleEl(0).getAttribute('aria-valuenow')).toBe('300')
  })

  it('updates the fixed pane in pixels and the flexible neighbour in percent on drag', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: '200px' }, { defaultSize: 60, min: 0 }] }} splitter={splitter} />,
    )

    await dragHandle(act, 0, 50)

    expect(splitter.current!.sizes[0]).toBe('250px')
    expect(Number(splitter.current!.sizes[1])).toBeCloseTo(75)
  })

  it('respects rtl when dragging a fixed pane', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: '200px' }, { defaultSize: 60, min: 0 }], dir: 'rtl' }} splitter={splitter} />,
    )

    await dragHandle(act, 0, 50)

    // rtl inverts the pointer delta, so dragging right shrinks the before pane.
    expect(splitter.current!.sizes[0]).toBe('150px')
  })

  it('collapses and expands a fixed pane preserving its unit', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: '240px', collapsible: true }, { defaultSize: 60, min: 0 }] }}
        splitter={splitter}
      />,
    )

    await act(() => splitter.current!.collapse(0))
    expect(splitter.current!.sizes[0]).toBe('0px')
    expect(splitter.current!.collapsed).toEqual([true, false])

    await act(() => splitter.current!.expand(0))
    expect(splitter.current!.sizes[0]).toBe('240px')
    expect(splitter.current!.collapsed).toEqual([false, false])
  })

  it('restores a fixed pane to its original px after it collapses mid-drag, not as a percentage', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{
          panels: [
            { defaultSize: '240px', collapsible: true, collapseThreshold: '120px', min: '0px' },
            { defaultSize: 60, min: 0 },
          ],
        }}
        splitter={splitter}
      />,
    )

    // Drag far enough left to cross the 120px collapse threshold.
    await dragHandle(act, 0, -200, 300)
    expect(splitter.current!.sizes[0]).toBe('0px')

    // The pre-collapse snapshot is the *raw* size, so expanding restores 240px.
    // A numeric working snapshot would be read back as 240% of the container.
    await act(() => splitter.current!.expand(0))
    expect(splitter.current!.sizes[0]).toBe('240px')
  })

  it('moves the handle by the pointer delta between two flexible panes next to a fixed pane', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: '240px' }, { defaultSize: 50, min: 0 }, { defaultSize: 50, min: 0 }] }}
        splitter={splitter}
      />,
    )

    await dragHandle(act, 1, 100)

    expect(splitter.current!.sizes[0]).toBe('240px')
    expect(Number(splitter.current!.sizes[1])).toBeCloseTo(48)
    expect(Number(splitter.current!.sizes[2])).toBeCloseTo(28)
  })

  it('measures the container through a ResizeObserver in pixel mode', async () => {
    const splitter = splitterRef()
    await render(<Harness options={{ panels: [{ defaultSize: '240px' }, { defaultSize: 60 }] }} splitter={splitter} />)

    const container = containerEl()
    // The effect measures on mount, before any resize is delivered. In pixel mode
    // an undeclared `max` is the container, so this reports the measured width.
    expect(splitter.current!.getHandleProps({ index: 0 })['aria-valuemax']).toBe(HARNESS_WIDTH)

    // A real resize is re-measured: halving the container halves the reported max.
    container.style.width = '500px'
    await expect.poll(() => container.getBoundingClientRect().width).toBe(500)
    await expect.poll(() => splitter.current!.getHandleProps({ index: 0 })['aria-valuemax']).toBe(500)
  })

  it('does not rewrite fixed sizes on a no-op drag when the panes overflow the container', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: '600px' }, { defaultSize: '600px' }] }} splitter={splitter} />,
    )

    await withRect(containerEl(), { width: HARNESS_WIDTH, height: HARNESS_HEIGHT }, () => dragHandle(act, 0, 0))

    expect(splitter.current!.sizes).toEqual(['600px', '600px'])
  })

  it('does not shrink overflowing fixed panes on a real drag', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: '600px' }, { defaultSize: '600px' }] }} splitter={splitter} />,
    )

    // container 1000px, fixed total 1200px -> scale 1000/1200, both panes render
    // at 500px. +50px rendered is +60px absolute each side.
    await withRect(containerEl(), { width: HARNESS_WIDTH, height: HARNESS_HEIGHT }, () => dragHandle(act, 0, 50))

    expect(splitter.current!.sizes[0]).toBe('660px')
    expect(splitter.current!.sizes[1]).toBe('540px')
  })

  it('does not shrink overflowing fixed panes on a keyboard resize', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: '600px' }, { defaultSize: '600px' }], step: '10px' }} splitter={splitter} />,
    )

    await withRect(containerEl(), { width: HARNESS_WIDTH, height: HARNESS_HEIGHT }, async () => {
      await keydownOn(act, 0, 'ArrowRight')
    })

    // +10px rendered -> +12px absolute each side.
    expect(splitter.current!.sizes[0]).toBe('612px')
    expect(splitter.current!.sizes[1]).toBe('588px')
  })

  it('hands space to a flexible pane without scaling the fixed pane up', async () => {
    const splitter = splitterRef()
    await render(
      <Harness options={{ panels: [{ defaultSize: '1200px' }, { defaultSize: 1, min: 0 }] }} splitter={splitter} />,
    )

    await withRect(containerEl(), { width: HARNESS_WIDTH, height: HARNESS_HEIGHT }, () => dragHandle(act, 0, -200, 300))

    // The overflow cleared, so the untouched fixed pane is re-encoded from its
    // working size rather than jumping back to its 1200px declared value.
    expect(splitter.current!.sizes[0]).not.toBe('1200px')
    expect(String(splitter.current!.sizes[0])).toMatch(/px$/)
  })
})

describe('useSplitter: multiple panels', () => {
  it('handles three panels, with one handle per gap', async () => {
    const splitter = splitterRef()
    await render(
      <Harness
        options={{ panels: [{ defaultSize: 20 }, { defaultSize: 30 }, { defaultSize: 50 }], step: 5 }}
        splitter={splitter}
      />,
    )

    expect(document.querySelectorAll('[data-testid^="handle-"]').length).toBe(2)
    expect(splitter.current!.sizes).toEqual([20, 30, 50])

    await keydownOn(act, 1, 'ArrowRight')
    expect(handleEl(1).getAttribute('aria-valuenow')).toBe('35')
    expect(splitter.current!.sizes).toEqual([20, 35, 45])
  })
})
