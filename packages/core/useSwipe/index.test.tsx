import type { UseSwipeDirection, UseSwipeReturn } from '../useSwipe'
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useSwipe } from '../useSwipe'

type SwipeCoords = Array<[number, number]>

const THRESHOLD = 30

// fresh element per test — leftover listeners from earlier tests can never
// interfere because no test dispatches on another test's element
function createTarget() {
  const el = document.createElement('div')
  el.id = 'swipe-target'
  document.body.appendChild(el)
  return el
}

// WebKit cannot construct a `Touch` (`new Touch()` throws "Illegal
// constructor") and also rejects `touches` inside the `TouchEventInit` dict
// (`new TouchEvent(type, { touches })` throws "Type error"), so the touch
// points are plain objects attached as an own `touches` property of a real
// `TouchEvent` built with the init form both engines accept.
function makeTouch(x: number, y: number, target: EventTarget) {
  return { identifier: 0, target, clientX: x, clientY: y } as unknown as Touch
}

function makeTouchEvent(type: string, x: number, y: number, target: EventTarget) {
  return makeMultiTouchEvent(type, [[x, y]], target)
}

function makeMultiTouchEvent(type: string, coords: SwipeCoords, target: EventTarget) {
  const event = new TouchEvent(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', {
    value: coords.map(([x, y]) => makeTouch(x, y, target)),
  })
  return event
}

// first entry is touchstart, last is touchend, everything in between is touchmove
function dispatchSwipeSequence(target: EventTarget, coords: SwipeCoords) {
  coords.forEach(([x, y], i) => {
    if (i === 0)
      target.dispatchEvent(makeTouchEvent('touchstart', x, y, target))
    else if (i === coords.length - 1)
      target.dispatchEvent(makeTouchEvent('touchend', x, y, target))
    else
      target.dispatchEvent(makeTouchEvent('touchmove', x, y, target))
  })
}

describe('useSwipe', () => {
  it('returns the idle state before any touch', async () => {
    const el = createTarget()
    const { result } = await renderHook(() => useSwipe({ current: el }))

    expect(result.current.isSwiping).toBe(false)
    expect(result.current.direction).toBe('none')
    expect(result.current.coordsStart).toEqual({ x: 0, y: 0 })
    expect(result.current.coordsEnd).toEqual({ x: 0, y: 0 })
    expect(result.current.lengthX).toBe(0)
    expect(result.current.lengthY).toBe(0)
  })

  it('tracks touchstart and touchmove reactivity', async () => {
    const el = createTarget()
    const { result, act } = await renderHook(() => useSwipe({ current: el }, { threshold: THRESHOLD }))

    await act(() => {
      el.dispatchEvent(makeTouchEvent('touchstart', 0, 0, el))
    })
    expect(result.current.isSwiping).toBe(false)
    expect(result.current.direction).toBe('none')
    expect(result.current.lengthX).toBe(0)
    expect(result.current.lengthY).toBe(0)

    await act(() => {
      el.dispatchEvent(makeTouchEvent('touchmove', THRESHOLD, 5, el))
    })
    expect(result.current.isSwiping).toBe(true)
    expect(result.current.direction).toBe('right')
    expect(result.current.lengthX).toBe(-THRESHOLD)
    expect(result.current.lengthY).toBe(-5)
  })

  it('does not fire callbacks while the threshold is not exceeded', async () => {
    const el = createTarget()
    const onSwipe = vi.fn()
    const onSwipeEnd = vi.fn()
    const { act } = await renderHook(() => useSwipe({ current: el }, { threshold: THRESHOLD, onSwipe, onSwipeEnd }))

    await act(() => {
      dispatchSwipeSequence(el, [[0, 0], [THRESHOLD - 1, 0], [THRESHOLD - 1, 0]])
    })

    expect(onSwipe).not.toHaveBeenCalled()
    expect(onSwipeEnd).not.toHaveBeenCalled()
  })

  it('fires onSwipe and onSwipeEnd once the threshold is exceeded', async () => {
    const el = createTarget()
    const onSwipe = vi.fn()
    const onSwipeEnd = vi.fn()
    const { act } = await renderHook(() => useSwipe({ current: el }, { threshold: THRESHOLD, onSwipe, onSwipeEnd }))

    await act(() => {
      dispatchSwipeSequence(el, [[0, 0], [THRESHOLD / 2, 0], [THRESHOLD, 0], [THRESHOLD, 0]])
    })

    expect(onSwipe).toHaveBeenCalledOnce()
    expect(onSwipeEnd).toHaveBeenCalledOnce()
    expect(onSwipeEnd.mock.calls[0]?.[0]).toBeInstanceOf(TouchEvent)
    expect(onSwipeEnd.mock.calls[0]?.[1]).toBe('right')
  })

  it('keeps reporting onSwipe after the threshold, ending in none when back below it', async () => {
    const el = createTarget()
    const onSwipe = vi.fn()
    const onSwipeEnd = vi.fn()
    const { act } = await renderHook(() => useSwipe({ current: el }, { threshold: THRESHOLD, onSwipe, onSwipeEnd }))

    await act(() => {
      dispatchSwipeSequence(el, [[0, 0], [THRESHOLD / 2, 0], [THRESHOLD, 0], [THRESHOLD - 1, 0], [THRESHOLD - 1, 0]])
    })

    expect(onSwipe).toHaveBeenCalledTimes(2)
    expect(onSwipeEnd).toHaveBeenCalledOnce()
    expect(onSwipeEnd.mock.calls[0]?.[1]).toBe('none')
  })

  const swipeCases: Array<[UseSwipeDirection, SwipeCoords]> = [
    ['up', [[0, 2 * THRESHOLD], [0, THRESHOLD], [0, THRESHOLD]]],
    ['down', [[0, 0], [0, THRESHOLD], [0, THRESHOLD]]],
    ['left', [[2 * THRESHOLD, 0], [THRESHOLD, 0], [THRESHOLD, 0]]],
    ['right', [[0, 0], [THRESHOLD, 0], [THRESHOLD, 0]]],
  ]

  it.each(swipeCases)('detects swipe %s past the threshold', async (expected, coords) => {
    const el = createTarget()
    const onSwipeEnd = vi.fn()
    const { result, act } = await renderHook(() => useSwipe({ current: el }, { threshold: THRESHOLD, onSwipeEnd }))

    await act(() => {
      dispatchSwipeSequence(el, coords)
    })

    expect(result.current.direction).toBe(expected)
    expect(onSwipeEnd).toHaveBeenCalledOnce()
    expect(onSwipeEnd.mock.calls[0]?.[1]).toBe(expected)
  })

  it('fires onSwipeStart once per touchstart with the event', async () => {
    const el = createTarget()
    const onSwipeStart = vi.fn()
    const { act } = await renderHook(() => useSwipe({ current: el }, { onSwipeStart }))

    const event = makeTouchEvent('touchstart', 10, 10, el)
    await act(() => {
      el.dispatchEvent(event)
    })

    expect(onSwipeStart).toHaveBeenCalledOnce()
    expect(onSwipeStart.mock.calls[0]?.[0]).toBe(event)
  })

  it('ignores touch events with more than one touch point', async () => {
    const el = createTarget()
    const onSwipeStart = vi.fn()
    const onSwipe = vi.fn()
    const { act } = await renderHook(() => useSwipe({ current: el }, { threshold: THRESHOLD, onSwipeStart, onSwipe }))

    await act(() => {
      el.dispatchEvent(makeMultiTouchEvent('touchstart', [[0, 0], [10, 10]], el))
      el.dispatchEvent(makeMultiTouchEvent('touchmove', [[0, THRESHOLD], [0, 0]], el))
    })

    expect(onSwipeStart).not.toHaveBeenCalled()
    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('uses the default threshold of 50', async () => {
    const el = createTarget()
    const { result, act } = await renderHook(() => useSwipe({ current: el }))

    await act(() => {
      dispatchSwipeSequence(el, [[0, 0], [49, 0], [49, 0]])
    })
    expect(result.current.direction).toBe('none')

    await act(() => {
      dispatchSwipeSequence(el, [[0, 0], [50, 0], [50, 0]])
    })
    expect(result.current.direction).toBe('right')
  })

  it('prevents touchmove default only when passive is false', async () => {
    const passiveEl = createTarget()
    const passiveHook = await renderHook(() => useSwipe({ current: passiveEl }, { threshold: THRESHOLD }))
    const passiveMove = makeTouchEvent('touchmove', THRESHOLD, 0, passiveEl)
    const passivePreventDefault = vi.spyOn(passiveMove, 'preventDefault')
    await passiveHook.act(() => {
      passiveEl.dispatchEvent(makeTouchEvent('touchstart', 0, 0, passiveEl))
      passiveEl.dispatchEvent(passiveMove)
    })
    expect(passivePreventDefault).not.toHaveBeenCalled()
    await passiveHook.unmount()

    const nonPassiveEl = createTarget()
    const nonPassiveHook = await renderHook(() => useSwipe({ current: nonPassiveEl }, { passive: false, threshold: THRESHOLD }))
    const nonPassiveMove = makeTouchEvent('touchmove', THRESHOLD, 0, nonPassiveEl)
    const nonPassivePreventDefault = vi.spyOn(nonPassiveMove, 'preventDefault')
    await nonPassiveHook.act(() => {
      nonPassiveEl.dispatchEvent(makeTouchEvent('touchstart', 0, 0, nonPassiveEl))
      nonPassiveEl.dispatchEvent(nonPassiveMove)
    })
    expect(nonPassivePreventDefault).toHaveBeenCalledOnce()
    await nonPassiveHook.unmount()
  })

  it('resolves a ref-like target at bind time, after it is populated', async () => {
    const el = createTarget()
    const targetRef: { current: EventTarget | null } = { current: null }
    const { result, act, rerender } = await renderHook<{ current: EventTarget | null }, UseSwipeReturn>(
      (props = targetRef) => useSwipe(props, { threshold: THRESHOLD }),
      { initialProps: targetRef },
    )

    // same object identity with `current` still null — nothing is bound yet
    await act(() => {
      dispatchSwipeSequence(el, [[0, 0], [THRESHOLD, 0], [THRESHOLD, 0]])
    })
    expect(result.current.direction).toBe('none')

    // populate `current` (simulating React attaching the element), then a
    // re-render re-resolves and binds
    targetRef.current = el
    await rerender(targetRef)
    await act(() => {
      dispatchSwipeSequence(el, [[0, 0], [0, THRESHOLD], [0, THRESHOLD]])
    })
    expect(result.current.direction).toBe('down')
  })

  it('binds a ref-like target attached during the commit phase without another render', async () => {
    const el = createTarget()
    const targetRef: { current: EventTarget | null } = { current: null }
    const onSwipeEnd = vi.fn()
    const { act, rerender } = await renderHook<{ mounted: EventTarget | null }, UseSwipeReturn>(
      ({ mounted } = { mounted: null as EventTarget | null }) => {
        const swipe = useSwipe(targetRef, { threshold: THRESHOLD, onSwipeEnd })
        // simulate React attaching the element during the commit phase that
        // follows this render — after `useSwipe` already read the ref
        targetRef.current = mounted
        return swipe
      },
      { initialProps: { mounted: null as EventTarget | null } },
    )

    // single render that mounts the element: a render-driven re-bind would
    // still see `null`, because the ref is written after the hook runs
    await rerender({ mounted: el })

    await act(() => {
      dispatchSwipeSequence(el, [[0, 0], [THRESHOLD, 0], [THRESHOLD, 0]])
    })

    expect(onSwipeEnd).toHaveBeenCalledOnce()
    expect(onSwipeEnd.mock.calls[0]?.[1]).toBe('right')
  })

  it('keeps its listeners when a re-render resolves the same target', async () => {
    const element = createTarget()
    const addSpy = vi.spyOn(element, 'addEventListener')
    const removeSpy = vi.spyOn(element, 'removeEventListener')
    const { rerender } = await renderHook<{ el: EventTarget | null }, UseSwipeReturn>(
      ({ el } = { el: element }) => useSwipe({ current: el }, { threshold: THRESHOLD }),
      { initialProps: { el: element } },
    )

    expect(addSpy).toHaveBeenCalledTimes(4)

    await rerender({ el: element })
    await rerender({ el: element })

    expect(addSpy).toHaveBeenCalledTimes(4)
    expect(removeSpy).not.toHaveBeenCalled()
  })

  it('re-binds the listeners when the resolved target changes', async () => {
    const elA = createTarget()
    const elB = createTarget()
    const onSwipeEnd = vi.fn()
    const { result, act, rerender } = await renderHook<{ el: EventTarget | null }, UseSwipeReturn>(
      ({ el } = { el: elA }) => useSwipe({ current: el }, { threshold: THRESHOLD, onSwipeEnd }),
      { initialProps: { el: elA } },
    )

    await act(() => {
      dispatchSwipeSequence(elA, [[0, 0], [THRESHOLD, 0], [THRESHOLD, 0]])
    })
    expect(result.current.direction).toBe('right')
    expect(onSwipeEnd).toHaveBeenCalledOnce()

    await rerender({ el: elB })

    // the old target is detached — dispatching on it changes nothing
    await act(() => {
      dispatchSwipeSequence(elA, [[0, 0], [THRESHOLD, 0], [THRESHOLD, 0]])
    })
    expect(onSwipeEnd).toHaveBeenCalledOnce()

    await act(() => {
      dispatchSwipeSequence(elB, [[0, 0], [0, THRESHOLD], [0, THRESHOLD]])
    })
    expect(result.current.direction).toBe('down')
    expect(onSwipeEnd).toHaveBeenCalledTimes(2)
    expect(onSwipeEnd.mock.calls[1]?.[1]).toBe('down')
  })

  it('treats touchcancel as a swipe end', async () => {
    const el = createTarget()
    const onSwipeEnd = vi.fn()
    const { result, act } = await renderHook(() => useSwipe({ current: el }, { threshold: THRESHOLD, onSwipeEnd }))

    await act(() => {
      el.dispatchEvent(makeTouchEvent('touchstart', 0, 0, el))
      el.dispatchEvent(makeTouchEvent('touchmove', THRESHOLD, 0, el))
    })
    expect(result.current.isSwiping).toBe(true)

    await act(() => {
      el.dispatchEvent(makeTouchEvent('touchcancel', THRESHOLD, 0, el))
    })
    expect(result.current.isSwiping).toBe(false)
    expect(onSwipeEnd).toHaveBeenCalledOnce()
    expect(onSwipeEnd.mock.calls[0]?.[1]).toBe('right')
  })

  it('removes its listeners on unmount', async () => {
    const el = createTarget()
    const onSwipeStart = vi.fn()
    const onSwipeEnd = vi.fn()
    const { result, unmount } = await renderHook(() => useSwipe({ current: el }, { threshold: THRESHOLD, onSwipeStart, onSwipeEnd }))
    await unmount()

    expect(() => {
      dispatchSwipeSequence(el, [[0, 0], [THRESHOLD, 0], [THRESHOLD, 0]])
    }).not.toThrow()

    expect(onSwipeStart).not.toHaveBeenCalled()
    expect(onSwipeEnd).not.toHaveBeenCalled()
    expect(result.current.direction).toBe('none')
  })

  it('stop() detaches the listeners for this instance', async () => {
    const el = createTarget()
    const onSwipeEnd = vi.fn()
    const { result, act } = await renderHook(() => useSwipe({ current: el }, { threshold: THRESHOLD, onSwipeEnd }))

    await act(() => {
      result.current.stop()
    })
    await act(() => {
      dispatchSwipeSequence(el, [[0, 0], [THRESHOLD, 0], [THRESHOLD, 0]])
    })

    expect(onSwipeEnd).not.toHaveBeenCalled()
    expect(result.current.direction).toBe('none')
  })
})
