import type { UseSplitterResolvedPanel } from './engine'
import { describe, expect, it, vi } from 'vitest'
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

/**
 * Tests for the sizing engine half of `useSplitter`.
 *
 * Upstream's suite (`use-splitter.test.tsx`, 1270 lines) drives every one of
 * these code paths through `renderHook` + `fireEvent`, which is why its CSS-unit
 * block needs a `getBoundingClientRect` spy: the hook's keyboard and drag
 * handlers are the only public way in. Turn 1 ports the arithmetic directly, so
 * each upstream assertion about resolved sizes, redistribution and collapse is
 * reproduced here as a plain function call — no React, no rendering, no refs.
 *
 * Two environment notes, both measured rather than assumed:
 * - the file is `.test.tsx` because that is the only glob vitest's browser
 *   project includes (`packages/**\/*.{test,spec}.tsx`); it renders nothing.
 * - `getRootFontSize` is the one helper that touches the DOM, and vitest's
 *   browser project provides a real `window`, so its SSR fallback branch is
 *   reasoned rather than exercised here (stated in its own test).
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
    // of every one of them.
    // The third entry is a numeric string rather than a `${number}%` template
    // literal, so it needs the cast; the other six are only near-misses that the
    // type would already reject, hence the untyped array.
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
