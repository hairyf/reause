import type { UseParallaxReturn } from '../useParallax'
import { afterEach, describe, expect, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useParallax } from '../useParallax'

/**
 * Track every element appended to the page so tests never leak DOM.
 */
const appendedElements: HTMLElement[] = []

/**
 * Create a real, visible target element. `position: fixed` makes its rect
 * viewport-relative and independent of the page layout, so `getClientRects`
 * always reports the same 200x200 box.
 */
function createTarget(): HTMLElement {
  const el = document.createElement('div')
  el.id = `parallax-target-${appendedElements.length}`
  el.style.position = 'fixed'
  el.style.left = '0px'
  el.style.top = '0px'
  el.style.width = '200px'
  el.style.height = '200px'
  document.body.appendChild(el)
  appendedElements.push(el)
  return el
}

function moveMouse(rect: DOMRect, x = 50, y = 50) {
  window.dispatchEvent(new MouseEvent('mousemove', {
    clientX: rect.left + x,
    clientY: rect.top + y,
    bubbles: true,
  }))
}

/**
 * Build a `deviceorientation` event carrying the sensor readings. WebKit
 * exposes `DeviceOrientationEvent` but its constructor throws ("Illegal
 * constructor"), so the readings are defined on a plain event — the listener
 * only depends on the event type and the `alpha`/`beta`/`gamma` values.
 */
function createDeviceOrientationEvent(alpha: number, beta: number, gamma: number) {
  const event = new Event('deviceorientation')
  Object.defineProperties(event, {
    alpha: { value: alpha, configurable: true },
    beta: { value: beta, configurable: true },
    gamma: { value: gamma, configurable: true },
  })
  return event as DeviceOrientationEvent
}

/**
 * Shadow `getClientRects` with a deterministic, mutable rect so scroll/resize
 * geometry can be asserted without depending on real layout.
 */
function mockRects(el: HTMLElement, rect: { left: number, top: number, width: number, height: number }) {
  Object.defineProperty(el, 'getClientRects', {
    configurable: true,
    value: () => [rect],
  })
  return rect
}

/**
 * Chromium exposes a real (environment-dependent) `screen.orientation`, so
 * shadow it with a deterministic own property. `afterEach` deletes the own
 * property again, which restores the browser's prototype accessor.
 */
function stubScreenOrientation(type: string, angle = 0) {
  Object.defineProperty(window.screen, 'orientation', {
    configurable: true,
    value: {
      type,
      angle,
      lock: () => Promise.resolve(),
      unlock: () => {},
    },
  })
}

afterEach(() => {
  delete (window.screen as { orientation?: unknown }).orientation
  appendedElements.splice(0).forEach(el => el.remove())
})

describe('useParallax', () => {
  it('returns 0 tilt/roll and mouse source before any sensor data', async () => {
    const { result } = await renderHook(() => useParallax({ current: null }))

    expect(result.current).toEqual({ tilt: 0, roll: 0, source: 'mouse' })
  })

  it('updates tilt/roll from the mouse position relative to the target element', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const { result, act } = await renderHook(() => useParallax(elRef))

    // 150px into a 200px box → tilt = (150 - 100) / 200 = 0.25,
    // roll = -(150 - 100) / 200 = -0.25
    await act(() => {
      moveMouse(el.getBoundingClientRect(), 150, 150)
    })

    await expect.poll(() => result.current.tilt).toBeCloseTo(0.25, 5)
    expect(result.current.roll).toBeCloseTo(-0.25, 5)
    expect(result.current.source).toBe('mouse')
  })

  it('keeps the last in-element values while the cursor is outside the element', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const { result, act } = await renderHook(() => useParallax(elRef))

    await act(() => {
      moveMouse(el.getBoundingClientRect(), 150, 150)
    })
    await expect.poll(() => result.current.tilt).toBeCloseTo(0.25, 5)

    // outside the box (negative coordinates) — values must not change
    await act(() => {
      moveMouse(el.getBoundingClientRect(), -50, -50)
    })
    expect(result.current.tilt).toBeCloseTo(0.25, 5)
    expect(result.current.roll).toBeCloseTo(-0.25, 5)
  })

  it('applies the mouse adjust callbacks', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const { result, act } = await renderHook(() => useParallax(elRef, {
      mouseTiltAdjust: i => i * 2,
      mouseRollAdjust: i => i * 3,
    }))

    await act(() => {
      moveMouse(el.getBoundingClientRect(), 150, 150)
    })

    // tilt = 0.25 * 2 = 0.5, roll = -0.25 * 3 = -0.75
    await expect.poll(() => result.current.tilt).toBeCloseTo(0.5, 5)
    expect(result.current.roll).toBeCloseTo(-0.75, 5)
  })

  it('falls back to device orientation values when alpha/gamma become non-zero', async () => {
    stubScreenOrientation('portrait-primary', 0)
    const { result, act } = await renderHook(() => useParallax({ current: null }))

    // supported but zero alpha/gamma → stays mouse
    await act(() => {
      window.dispatchEvent(createDeviceOrientationEvent(0, 0, 0))
    })
    await expect.poll(() => result.current.source).toBe('mouse')

    await act(() => {
      window.dispatchEvent(createDeviceOrientationEvent(45, 10, 20))
    })
    await expect.poll(() => result.current.source).toBe('deviceOrientation')
    // portrait-primary: roll = -beta / 90, tilt = gamma / 90
    expect(result.current.roll).toBeCloseTo(-10 / 90, 5)
    expect(result.current.tilt).toBeCloseTo(20 / 90, 5)
  })

  it('keeps tilt/roll cursor-relative across scroll and resize instead of snapping to the corner', async () => {
    const el = createTarget()
    const elRef = { current: el }
    // deterministic geometry: a 200x200 box at (100, 100) in the viewport
    const rect = mockRects(el, { left: 100, top: 100, width: 200, height: 200 })
    const { result, act } = await renderHook(() => useParallax(elRef))

    // cursor 150px into the box → tilt = (150 - 100) / 200 = 0.25,
    // roll = -(150 - 100) / 200 = -0.25
    await act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 250, clientY: 250, bubbles: true }))
    })
    await expect.poll(() => result.current.tilt).toBeCloseTo(0.25, 5)
    expect(result.current.roll).toBeCloseTo(-0.25, 5)

    // the page scrolls by 40px: the element moves up, the cursor stays put.
    // Re-measuring without a persisted cursor snapped tilt/roll to the element
    // corner (-0.5 / +0.5) until the next mousemove.
    await act(() => {
      rect.top = 60
      window.dispatchEvent(new Event('scroll'))
    })
    // elementY = 250 - 60 = 190 → roll = -(190 - 100) / 200 = -0.45
    await expect.poll(() => result.current.roll).toBeCloseTo(-0.45, 5)
    expect(result.current.tilt).toBeCloseTo(0.25, 5)

    // resize re-measures against the same persisted cursor position
    await act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current.tilt).toBeCloseTo(0.25, 5)
    expect(result.current.roll).toBeCloseTo(-0.45, 5)
  })

  it('applies the deviceOrientation adjust callbacks', async () => {
    stubScreenOrientation('portrait-primary', 0)
    const { result, act } = await renderHook(() => useParallax({ current: null }, {
      deviceOrientationTiltAdjust: i => i * 2,
      deviceOrientationRollAdjust: i => i * 3,
    }))

    await act(() => {
      window.dispatchEvent(createDeviceOrientationEvent(45, 10, 20))
    })

    await expect.poll(() => result.current.source).toBe('deviceOrientation')
    // portrait-primary: tilt = gamma / 90, roll = -beta / 90
    expect(result.current.tilt).toBeCloseTo((20 / 90) * 2, 5)
    expect(result.current.roll).toBeCloseTo((-10 / 90) * 3, 5)
  })

  it('returns finite 0 for a zero-size rect where upstream yields NaN', async () => {
    const el = createTarget()
    const elRef = { current: el }
    mockRects(el, { left: 0, top: 0, width: 0, height: 0 })
    const { result, act } = await renderHook(() => useParallax(elRef))

    await act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10, bubbles: true }))
    })

    expect(result.current).toEqual({ tilt: 0, roll: 0, source: 'mouse' })
  })

  it('resolves a ref target at bind time, after it is populated', async () => {
    const el = createTarget()
    const targetRef: { current: HTMLElement | null } = { current: null }
    const { result, act, rerender } = await renderHook<{ current: HTMLElement | null }, UseParallaxReturn>(
      (props?: { current: HTMLElement | null }) => useParallax(props ?? targetRef),
      { initialProps: targetRef },
    )

    // same object identity with `current` still null — nothing is bound yet
    await act(() => {
      moveMouse(el.getBoundingClientRect(), 150, 150)
    })
    expect(result.current.tilt).toBe(0)

    // populate `current` (simulating React attaching the element), then a
    // re-render re-resolves and binds
    targetRef.current = el
    await rerender(targetRef)

    await act(() => {
      moveMouse(el.getBoundingClientRect(), 150, 150)
    })
    await expect.poll(() => result.current.tilt).toBeCloseTo(0.25, 5)
    expect(result.current.roll).toBeCloseTo(-0.25, 5)
  })

  it('returns finite 0 tilt/roll on the first render before the mount effect measures', async () => {
    const snapshots: Array<{ tilt: number, roll: number, source: 'deviceOrientation' | 'mouse' }> = []

    function Probe() {
      const parallax = useParallax({ current: null })
      snapshots.push({ tilt: parallax.tilt, roll: parallax.roll, source: parallax.source })
      return <div>{parallax.tilt}</div>
    }

    // client render: the hook reads no `window`/DOM during render, so the
    // first render matches what an SSR pass would emit
    await render(<Probe />)

    expect(snapshots[0]).toEqual({ tilt: 0, roll: 0, source: 'mouse' })
  })

  it('removes its listeners on unmount', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const { result, act, unmount } = await renderHook(() => useParallax(elRef))

    await act(() => {
      moveMouse(el.getBoundingClientRect(), 150, 150)
    })
    await expect.poll(() => result.current.tilt).toBeCloseTo(0.25, 5)

    const before = { tilt: result.current.tilt, roll: result.current.roll }
    await unmount()

    // listeners are gone — a mousemove at a different position is ignored
    moveMouse(el.getBoundingClientRect(), 50, 50)

    expect(result.current.tilt).toBe(before.tilt)
    expect(result.current.roll).toBe(before.roll)
  })
})
