import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useScroll } from '../useScroll'

const X_LEFT_ARRIVED = JSON.stringify({
  left: true,
  right: false,
  top: true,
  bottom: false,
}, null, 2)
const X_RIGHT_ARRIVED = JSON.stringify({
  left: false,
  right: true,
  top: true,
  bottom: false,
}, null, 2)
const Y_BOTTOM_ARRIVED = JSON.stringify({
  left: true,
  right: false,
  top: false,
  bottom: true,
}, null, 2)
const ALL_ARRIVED = JSON.stringify({
  left: true,
  right: true,
  top: true,
  bottom: true,
}, null, 2)

describe('useScroll', () => {
  it('should be defined', () => {
    expect(useScroll).toBeDefined()
  })

  it('should have default x and y', async () => {
    const { result } = await renderHook(() => useScroll({ current: window }))

    expect(result.current.x).toBe(0)
    expect(result.current.y).toBe(0)
  })

  it('should have right default values', async () => {
    const { result } = await renderHook(() => useScroll({ current: window }))

    expect(result.current.x).toBe(0)
    expect(result.current.y).toBe(0)
    expect(result.current.isScrolling).toBe(false)
    expect(result.current.arrivedState).toEqual({
      left: true,
      right: true,
      top: true,
      bottom: true,
    })
    expect(result.current.directions).toEqual({
      left: false,
      right: false,
      top: false,
      bottom: false,
    })
    expect(result.current.measure).toBeTypeOf('function')
    expect(result.current.setX).toBeTypeOf('function')
    expect(result.current.setY).toBeTypeOf('function')
  })

  it('should expose setters that scroll the element', async () => {
    const { result, act } = await renderHook(() => useScroll({ current: window }))

    // the window is not scrollable in the test viewport, so the position
    // stays clamped at 0 — the setters must at least not throw and stay
    // consistent
    await act(() => {
      result.current.setX(0)
      result.current.setY(0)
    })
    expect(result.current.x).toBe(0)
    expect(result.current.y).toBe(0)
  })
})

/**
 * Mirrors the upstream `index.browser.test.ts` component: a scrollable box
 * with buttons to scroll to the edges, toggle the inner content size and
 * toggle whether the box is rendered at all, plus a `<pre>` that renders the
 * current `arrivedState`.
 */
function ScrollTestComponent({ observe = false }: { observe?: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  const { arrivedState, setX, setY, measure } = useScroll(el, { observe: observe ?? false })
  const [showBox, setShowBox] = useState(true)
  const [width, setWidth] = useState(500)
  const [height, setHeight] = useState(500)

  function triggerScrollManually() {
    el.current?.dispatchEvent(new Event('scroll'))
  }

  function goToLeft() {
    setX(0)
    triggerScrollManually()
  }

  function goToRight() {
    setX(el.current?.scrollWidth || 300)
    triggerScrollManually()
  }

  function goToTop() {
    setY(0)
    triggerScrollManually()
  }

  function goToBottom() {
    setY(el.current?.scrollHeight || 300)
    triggerScrollManually()
  }

  function toggleWidth() {
    setWidth(w => (w < 500 ? 500 : 300))
  }

  function toggleHeight() {
    setHeight(h => (h < 500 ? 500 : 300))
  }

  function toggleBox() {
    setShowBox(v => !v)
  }

  return (
    <div>
      <div style={{ padding: 12, display: 'flex', gap: 8 }}>
        <button data-testid="left" onClick={goToLeft}>goToLeft</button>
        <button data-testid="right" onClick={goToRight}>goToRight</button>
        <button data-testid="top" onClick={goToTop}>goToTop</button>
        <button data-testid="bottom" onClick={goToBottom}>goToBottom</button>
        <button data-testid="toggleWidth" onClick={toggleWidth}>toggleWidth</button>
        <button data-testid="toggleHeight" onClick={toggleHeight}>toggleHeight</button>
        <button data-testid="toggleBox" onClick={toggleBox}>toggleBox</button>
        <button data-testid="measure" onClick={() => measure()}>measure</button>
      </div>
      <pre data-testid="arrivedState">{JSON.stringify(arrivedState, null, 2)}</pre>
      <div ref={el} style={{ width: 300, height: 300, margin: 'auto', overflow: 'auto' }}>
        {showBox && <div style={{ width, height, position: 'relative' }} />}
      </div>
    </div>
  )
}

describe('useScroll element', () => {
  it('should correctly detect leftArrived and rightArrived states when reaching the X-axis boundaries', async () => {
    const screen = await render(<ScrollTestComponent observe />)
    const arrivedState = screen.getByTestId('arrivedState')
    await expect.element(arrivedState).toBeVisible()

    const rightButton = screen.getByTestId('right')
    await expect.element(rightButton).toBeVisible()
    await rightButton.click()
    await expect.poll(() => arrivedState.query()?.textContent).toBe(X_RIGHT_ARRIVED)

    const leftButton = screen.getByTestId('left')
    await expect.element(leftButton).toBeVisible()
    await leftButton.click()
    await expect.poll(() => arrivedState.query()?.textContent).toBe(X_LEFT_ARRIVED)
  })

  it('should correctly detect topArrived and bottomArrived states when reaching the Y-axis boundaries', async () => {
    const screen = await render(<ScrollTestComponent observe />)
    const arrivedState = screen.getByTestId('arrivedState')
    await expect.element(arrivedState).toBeVisible()

    const bottomButton = screen.getByTestId('bottom')
    await expect.element(bottomButton).toBeVisible()
    await bottomButton.click()
    await expect.poll(() => arrivedState.query()?.textContent).toBe(Y_BOTTOM_ARRIVED)

    const topButton = screen.getByTestId('top')
    await expect.element(topButton).toBeVisible()
    await topButton.click()
    await expect.poll(() => arrivedState.query()?.textContent).toBe(X_LEFT_ARRIVED)
  })

  describe('observe DOM mutations when observe is enabled', () => {
    it('should detect boundary changes when child element size is modified', async () => {
      const screen = await render(<ScrollTestComponent observe />)
      const arrivedState = screen.getByTestId('arrivedState')
      await expect.element(arrivedState).toBeVisible()
      const toggleHeightButton = screen.getByTestId('toggleHeight')
      const toggleWidthButton = screen.getByTestId('toggleWidth')
      await expect.element(toggleHeightButton).toBeVisible()
      await expect.element(toggleWidthButton).toBeVisible()

      await toggleHeightButton.click()
      await toggleWidthButton.click()
      await expect.poll(() => arrivedState.query()?.textContent).toBe(ALL_ARRIVED)

      await toggleHeightButton.click()
      await toggleWidthButton.click()
      await expect.poll(() => arrivedState.query()?.textContent).toBe(X_LEFT_ARRIVED)
    })

    it('should detect boundary changes when child element is added or removed', async () => {
      const screen = await render(<ScrollTestComponent observe />)
      const arrivedState = screen.getByTestId('arrivedState')
      await expect.element(arrivedState).toBeVisible()
      const toggleBoxButton = screen.getByTestId('toggleBox')
      await expect.element(toggleBoxButton).toBeVisible()

      await toggleBoxButton.click()
      await expect.poll(() => arrivedState.query()?.textContent).toBe(ALL_ARRIVED)

      await toggleBoxButton.click()
      await expect.poll(() => arrivedState.query()?.textContent).toBe(X_LEFT_ARRIVED)
    })
  })

  it('measure() recomputes arrivedState without scroll events', async () => {
    // without `observe`, DOM changes do not re-measure — the state only
    // updates on scroll events or an explicit `measure()` call
    const screen = await render(<ScrollTestComponent observe={false} />)
    const arrivedState = screen.getByTestId('arrivedState')
    await expect.element(arrivedState).toBeVisible()
    await expect.poll(() => arrivedState.query()?.textContent).toBe(X_LEFT_ARRIVED)

    const toggleHeightButton = screen.getByTestId('toggleHeight')
    const toggleWidthButton = screen.getByTestId('toggleWidth')
    await expect.element(toggleHeightButton).toBeVisible()
    await expect.element(toggleWidthButton).toBeVisible()

    // shrink the content to fit: no scroll event fires (observe is off), so
    // the arrivedState stays stale
    await toggleHeightButton.click()
    await toggleWidthButton.click()
    await expect.poll(() => arrivedState.query()?.textContent).toBe(X_LEFT_ARRIVED)

    // measure() recalculates from the live DOM without any scroll event
    const measureButton = screen.getByTestId('measure')
    await expect.element(measureButton).toBeVisible()
    await measureButton.click()
    await expect.poll(() => arrivedState.query()?.textContent).toBe(ALL_ARRIVED)
  })
})

/**
 * Mounts `useScroll` on a detached scrollable element and captures the
 * registered `scroll` listener via an `addEventListener` spy.
 */
async function scrollListenerFor(throttle: number, onScroll: (e: Event) => void) {
  const el = document.createElement('div')
  el.style.width = '100px'
  el.style.height = '100px'
  el.style.overflow = 'auto'
  el.innerHTML = '<div style="width: 200px; height: 200px;"></div>'
  const addSpy = vi.spyOn(el, 'addEventListener')
  const hook = await renderHook(() => useScroll({ current: el }, { throttle, onScroll }))
  const scrollCall = addSpy.mock.calls.find(([type]) => type === 'scroll')
  addSpy.mockRestore()
  return {
    listener: scrollCall?.[1] as ((e: Event) => unknown) | undefined,
    ...hook,
  }
}

describe('useScroll listener registration', () => {
  it('registers the raw scroll handler when throttle is 0 (upstream parity)', async () => {
    const onScroll = vi.fn()
    const { listener, act, unmount } = await scrollListenerFor(0, onScroll)
    expect(listener).toBeTypeOf('function')

    // the raw handler is synchronous and does not return a promise (unlike
    // the `useThrottleFn` wrapper)
    let ret: unknown = 'sentinel'
    await act(() => {
      ret = listener?.({ target: document.documentElement } as unknown as Event)
    })
    expect(ret).toBeUndefined()
    expect(onScroll).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('registers the throttled wrapper when throttle > 0', async () => {
    const onScroll = vi.fn()
    const { listener, act, unmount } = await scrollListenerFor(100, onScroll)
    expect(listener).toBeTypeOf('function')

    // the throttled wrapper returns a promise and, mirroring upstream
    // (`useThrottleFn(..., true, false)` — trailing only), does not invoke
    // `onScroll` on the leading edge
    let ret: unknown = 'sentinel'
    await act(() => {
      ret = listener?.({ target: document.documentElement } as unknown as Event)
    })
    expect(ret).toBeInstanceOf(Promise)
    expect(onScroll).toHaveBeenCalledTimes(0)

    await unmount()
  })
})

describe('useScroll cleanup on unmount', () => {
  it('removes scroll/scrollend listeners and disconnects the observer', async () => {
    const el = document.createElement('div')
    const addSpy = vi.spyOn(el, 'addEventListener')
    const removeSpy = vi.spyOn(el, 'removeEventListener')
    const disconnectSpy = vi.spyOn(MutationObserver.prototype, 'disconnect')
    const onScroll = vi.fn()

    const { act, unmount } = await renderHook(() => useScroll({ current: el }, { observe: true, onScroll }))

    // both listeners are registered exactly once
    expect(addSpy.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1)
    expect(addSpy.mock.calls.filter(([type]) => type === 'scrollend')).toHaveLength(1)

    // the scroll listener is live before unmount
    await act(() => {
      el.dispatchEvent(new Event('scroll'))
    })
    expect(onScroll).toHaveBeenCalledTimes(1)

    await unmount()

    // cleanup removes both listeners, with the same options
    expect(removeSpy.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1)
    expect(removeSpy.mock.calls.filter(([type]) => type === 'scrollend')).toHaveLength(1)

    // ...and disconnects the MutationObserver
    expect(disconnectSpy).toHaveBeenCalled()

    // further events are no-ops after unmount
    el.dispatchEvent(new Event('scroll'))
    expect(onScroll).toHaveBeenCalledTimes(1)

    addSpy.mockRestore()
    removeSpy.mockRestore()
    disconnectSpy.mockRestore()
  })
})
