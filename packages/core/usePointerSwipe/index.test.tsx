import type { UseSwipeDirection } from '../useSwipe'
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { usePointerSwipe } from '../usePointerSwipe'

const threshold = 30

// fresh element per test — leftover listeners from earlier tests can never
// interfere because no test dispatches on another test's element
function createTarget() {
  const el = document.createElement('div')
  el.id = 'pointer-swipe-target'
  // set to noop, else test will fail
  el.setPointerCapture = () => {}
  document.body.appendChild(el)
  return el
}

function mockPointerEventInit(x: number, y: number): PointerEventInit {
  return {
    clientX: x,
    clientY: y,
  }
}

function mockPointerDown(x: number, y: number) {
  return new PointerEvent('pointerdown', mockPointerEventInit(x, y))
}
function mockPointerMove(x: number, y: number) {
  return new PointerEvent('pointermove', mockPointerEventInit(x, y))
}
function mockPointerUp(x: number, y: number) {
  return new PointerEvent('pointerup', mockPointerEventInit(x, y))
}

function mockPointerEvents(target: Element, coords: Array<[number, number]>) {
  coords.forEach(([x, y], i) => {
    if (i === 0)
      target.dispatchEvent(mockPointerDown(x, y))
    else if (i === coords.length - 1)
      target.dispatchEvent(mockPointerUp(x, y))
    else
      target.dispatchEvent(mockPointerMove(x, y))
  })
}

describe('usePointerSwipe', () => {
  it('threshold is not exceeded', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const onSwipeStart = vi.fn()
    const onSwipe = vi.fn()
    const onSwipeEnd = vi.fn()
    const { act } = await renderHook(() => usePointerSwipe(elRef, { threshold, onSwipeStart, onSwipe, onSwipeEnd }))

    await act(() => {
      mockPointerEvents(el, [[0, 0], [threshold - 1, 0], [threshold - 1, 0]])
    })

    expect(onSwipeStart.mock.calls.length).toBe(1)
    expect(onSwipe.mock.calls.length).toBe(0)
    expect(onSwipeEnd.mock.calls.length).toBe(0)
  })

  it('threshold is exceeded', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const onSwipeStart = vi.fn()
    const onSwipe = vi.fn()
    const onSwipeEnd = vi.fn()
    const { act } = await renderHook(() => usePointerSwipe(elRef, { threshold, onSwipeStart, onSwipe, onSwipeEnd }))

    await act(() => {
      mockPointerEvents(el, [[0, 0], [threshold / 2, 0], [threshold, 0], [threshold, 0]])
    })

    expect(onSwipeStart).toHaveBeenCalledOnce()
    expect(onSwipe).toHaveBeenCalledOnce()
    expect(onSwipeEnd).toHaveBeenCalledOnce()
    expect(onSwipeEnd).toHaveBeenCalledWith(expect.anything(), 'right')
  })

  it('threshold is exceeded in between', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const onSwipeStart = vi.fn()
    const onSwipe = vi.fn()
    const onSwipeEnd = vi.fn()
    const { act } = await renderHook(() => usePointerSwipe(elRef, { threshold, onSwipeStart, onSwipe, onSwipeEnd }))

    await act(() => {
      mockPointerEvents(el, [[0, 0], [threshold / 2, 0], [threshold, 0], [threshold - 1, 0], [threshold - 1, 0]])
    })

    expect(onSwipeStart).toHaveBeenCalledOnce()
    expect(onSwipe).toHaveBeenCalledTimes(2)
    expect(onSwipeEnd).toHaveBeenCalledOnce()
    expect(onSwipeEnd).toHaveBeenCalledWith(expect.anything(), 'none')
  })

  it('reactivity', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const onSwipeStart = vi.fn()
    const onSwipe = vi.fn()
    const onSwipeEnd = vi.fn()
    const { result, act } = await renderHook(() => usePointerSwipe(elRef, { threshold, onSwipeStart, onSwipe, onSwipeEnd }))

    await act(() => {
      el.dispatchEvent(mockPointerDown(0, 0))
    })
    expect(result.current.isSwiping).toBeFalsy()
    expect(result.current.direction).toBe('none')
    expect(result.current.distanceX).toBe(0)
    expect(result.current.distanceY).toBe(0)

    await act(() => {
      el.dispatchEvent(mockPointerMove(threshold, threshold / 2))
    })
    expect(result.current.isSwiping).toBeTruthy()
    expect(result.current.direction).toBe('right')
    expect(result.current.distanceX).toBe(-threshold)
    expect(result.current.distanceY).toBe(-threshold / 2)

    await act(() => {
      el.dispatchEvent(mockPointerUp(threshold, threshold / 2))
    })
    expect(result.current.isSwiping).toBeFalsy()
    expect(result.current.direction).toBe('right')
    expect(result.current.distanceX).toBe(-threshold)
    expect(result.current.distanceY).toBe(-threshold / 2)
  })

  it('not reactivity when pointer types not matched', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const { result, act } = await renderHook(() => usePointerSwipe(elRef, { threshold, pointerTypes: ['touch'] }))

    await act(() => {
      el.dispatchEvent(mockPointerDown(0, 0))
    })
    expect(result.current.isSwiping).toBeFalsy()
    expect(result.current.direction).toBe('none')
    expect(result.current.distanceX).toBe(0)
    expect(result.current.distanceY).toBe(0)

    await act(() => {
      el.dispatchEvent(mockPointerMove(threshold, threshold / 2))
    })
    expect(result.current.isSwiping).toBeFalsy()
    expect(result.current.direction).toBe('none')
    expect(result.current.distanceX).toBe(0)
    expect(result.current.distanceY).toBe(0)

    await act(() => {
      el.dispatchEvent(mockPointerUp(threshold, threshold / 2))
    })
    expect(result.current.isSwiping).toBeFalsy()
    expect(result.current.direction).toBe('none')
    expect(result.current.distanceX).toBe(0)
    expect(result.current.distanceY).toBe(0)
  })

  it('not reactivity when pointer not down', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const { result, act } = await renderHook(() => usePointerSwipe(elRef, { threshold }))

    await act(() => {
      el.dispatchEvent(mockPointerMove(threshold, threshold / 2))
    })
    expect(result.current.isSwiping).toBeFalsy()
    expect(result.current.direction).toBe('none')
    expect(result.current.distanceX).toBe(0)
    expect(result.current.distanceY).toBe(0)
  })

  it('stop detaches the pointer listeners', async () => {
    const el = createTarget()
    const elRef = { current: el }
    const onSwipeStart = vi.fn()
    const onSwipe = vi.fn()
    const onSwipeEnd = vi.fn()
    const { result, act } = await renderHook(() => usePointerSwipe(elRef, { threshold, onSwipeStart, onSwipe, onSwipeEnd }))

    // a real swipe while listening fires the callbacks
    await act(() => {
      mockPointerEvents(el, [[0, 0], [threshold, 0], [threshold, 0]])
    })
    expect(onSwipeStart).toHaveBeenCalledOnce()
    expect(onSwipe).toHaveBeenCalledOnce()
    expect(onSwipeEnd).toHaveBeenCalledOnce()
    expect(result.current.isSwiping).toBeFalsy()

    await act(() => {
      result.current.stop()
    })

    // after stop() the same swipe must no longer reach the callbacks
    await act(() => {
      mockPointerEvents(el, [[0, 0], [threshold, 0], [threshold, 0]])
    })
    expect(onSwipeStart).toHaveBeenCalledOnce()
    expect(onSwipe).toHaveBeenCalledOnce()
    expect(onSwipeEnd).toHaveBeenCalledOnce()
    expect(result.current.isSwiping).toBeFalsy()
  })

  const directionTests: Array<[UseSwipeDirection, Array<[number, number]>]> = [
    ['up', [[0, 2 * threshold], [0, threshold], [0, threshold]]],
    ['down', [[0, 0], [0, threshold], [0, threshold]]],
    ['left', [[2 * threshold, 0], [threshold, 0], [threshold, 0]]],
    ['right', [[0, 0], [threshold, 0], [threshold, 0]]],
  ]

  it.each(directionTests)('detects swipes to the %s', async (expected, coords) => {
    const el = createTarget()
    const elRef = { current: el }
    const onSwipeEnd = vi.fn()
    const { result, act } = await renderHook(() => usePointerSwipe(elRef, { threshold, onSwipeEnd }))

    await act(() => {
      mockPointerEvents(el, coords)
    })

    expect(result.current.direction).toBe(expected)
    expect(onSwipeEnd).toHaveBeenLastCalledWith(expect.anything(), expected)
  })
})
