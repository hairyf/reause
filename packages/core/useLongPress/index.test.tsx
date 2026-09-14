import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useLongPress } from '../useLongPress'

describe('useLongPress', () => {
  let element: HTMLElement
  let elementRef: { current: HTMLElement }
  let pointerdownEvent: PointerEvent
  let pointerupEvent: PointerEvent

  beforeEach(() => {
    vi.useFakeTimers()
    element = document.createElement('div')
    elementRef = { current: element }
    pointerdownEvent = new PointerEvent('pointerdown', { cancelable: true, bubbles: true })
    pointerupEvent = new PointerEvent('pointerup', { cancelable: true, bubbles: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function triggerCallback() {
    const onLongPressCallback = vi.fn()
    await renderHook(() => useLongPress(elementRef, onLongPressCallback))
    element.dispatchEvent(pointerdownEvent)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
  }

  async function triggerCallbackWithDelay(delay = 1000) {
    const onLongPressCallback = vi.fn()
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { delay }))
    // first pointer down
    element.dispatchEvent(pointerdownEvent)

    // wait for 500ms after pointer down
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)

    // pointer up to cancel the pending long press
    element.dispatchEvent(pointerupEvent)

    // wait for 500ms after pointer up
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)

    // another pointer down
    element.dispatchEvent(pointerdownEvent)

    // wait for the configured delay after pointer down
    await vi.advanceTimersByTimeAsync(delay)
    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
  }

  async function triggerCallbackWithDelayFunction() {
    const onLongPressCallback = vi.fn()
    const delayFn = vi.fn((_ev: PointerEvent) => 2000)
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { delay: delayFn }))

    element.dispatchEvent(pointerdownEvent)

    // the delay function receives the pointer event that started the press
    expect(delayFn).toHaveBeenCalledTimes(1)
    expect(delayFn.mock.calls[0][0]).toBe(pointerdownEvent)

    await vi.advanceTimersByTimeAsync(1999)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)

    await vi.advanceTimersByTimeAsync(1)
    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
  }

  async function notTriggerCallbackOnChildLongPress() {
    const onLongPressCallback = vi.fn()
    const child = document.createElement('span')
    element.appendChild(child)
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { modifiers: { self: true } }))

    // the press starts on a child element — `self` rejects it
    child.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true }))
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)

    // the press starts on the target itself — `self` allows it
    element.dispatchEvent(pointerdownEvent)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
  }

  async function workOnceAndPreventModifiers() {
    const onLongPressCallback = vi.fn()
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { modifiers: { once: true, prevent: true } }))

    element.dispatchEvent(pointerdownEvent)

    await vi.advanceTimersByTimeAsync(500)

    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
    expect(pointerdownEvent.defaultPrevented).toBe(true)

    // `once` removed the pointerdown listener — a second press does nothing
    element.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true }))

    await vi.advanceTimersByTimeAsync(500)

    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
  }

  async function stopPropagation() {
    const onLongPressCallback = vi.fn()
    const onParentPointerDown = vi.fn()
    const parent = document.createElement('div')
    parent.appendChild(element)
    parent.addEventListener('pointerdown', onParentPointerDown)
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { modifiers: { stop: true } }))

    element.dispatchEvent(pointerdownEvent)

    await vi.advanceTimersByTimeAsync(500)

    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
    expect(onParentPointerDown).toHaveBeenCalledTimes(0)
  }

  async function captureModifier() {
    const onLongPressCallback = vi.fn()
    const bubblePhaseDefaultPrevented = vi.fn()
    const child = document.createElement('span')
    element.appendChild(child)
    // bubble-phase listener on the target: it only observes `preventDefault`
    // when the long-press listener ran earlier in the capture phase
    element.addEventListener('pointerdown', (evt) => {
      bubblePhaseDefaultPrevented(evt.defaultPrevented)
    })
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { modifiers: { capture: true, prevent: true } }))

    child.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true }))

    expect(bubblePhaseDefaultPrevented).toHaveBeenCalledWith(true)

    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
  }

  async function triggerCallbackWithDistanceThreshold() {
    const onLongPressCallback = vi.fn()
    const positionPointerdownEvent = new PointerEvent('pointerdown', { cancelable: true, bubbles: true, clientX: 20, clientY: 20 })
    const moveWithinThresholdEvent = new PointerEvent('pointermove', { cancelable: true, bubbles: true, clientX: 17, clientY: 25 })
    const moveOutsideThresholdEvent = new PointerEvent('pointermove', { cancelable: true, bubbles: true, clientX: 4, clientY: 30 })
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { distanceThreshold: 15, delay: 1000 }))
    // first pointer down
    element.dispatchEvent(positionPointerdownEvent)

    // pointer moves outside the distance threshold — the long press gets canceled
    await vi.advanceTimersByTimeAsync(500)
    element.dispatchEvent(moveOutsideThresholdEvent)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)

    // pointer up to release
    element.dispatchEvent(pointerupEvent)

    // wait for 500ms after pointer up
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)

    // another pointer down
    element.dispatchEvent(positionPointerdownEvent)

    // pointer moves within the distance threshold — the long press still fires
    await vi.advanceTimersByTimeAsync(500)
    element.dispatchEvent(moveWithinThresholdEvent)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
  }

  async function ignoreMovementWithDisabledDistanceThreshold() {
    const onLongPressCallback = vi.fn()
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { distanceThreshold: false, delay: 1000 }))

    element.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true, clientX: 0, clientY: 0 }))
    element.dispatchEvent(new PointerEvent('pointermove', { cancelable: true, bubbles: true, clientX: 500, clientY: 500 }))

    await vi.advanceTimersByTimeAsync(1000)
    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
  }

  async function notTriggerOnMouseUpAfterMovingTooFar() {
    const onLongPressCallback = vi.fn()
    const onMouseUpCallback = vi.fn()
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { distanceThreshold: 15, onMouseUp: onMouseUpCallback }))

    element.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true, clientX: 20, clientY: 20 }))
    // moving beyond the threshold silently clears the press — no release callback
    element.dispatchEvent(new PointerEvent('pointermove', { cancelable: true, bubbles: true, clientX: 4, clientY: 30 }))
    element.dispatchEvent(pointerupEvent)

    expect(onMouseUpCallback).toHaveBeenCalledTimes(0)

    await vi.advanceTimersByTimeAsync(1000)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)
  }

  async function triggerOnMouseUp() {
    const onLongPressCallback = vi.fn()
    const onMouseUpCallback = vi.fn()
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { onMouseUp: onMouseUpCallback }))

    // first pointer down
    element.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true }))

    // wait for 250ms after pointer down — not a long press yet
    await vi.advanceTimersByTimeAsync(250)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)
    expect(onMouseUpCallback).toHaveBeenCalledTimes(0)

    // pointer up before the delay — released without a long press
    element.dispatchEvent(new PointerEvent('pointerup', { cancelable: true, bubbles: true }))
    expect(onMouseUpCallback).toHaveBeenCalledTimes(1)
    expect(onMouseUpCallback).toHaveBeenCalledWith(expect.any(Number), 0, false, expect.any(PointerEvent))

    // wait for 500ms after pointer up
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)

    // another pointer down
    element.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true }))

    // wait for 500ms after pointer down — the long press fires
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(1)
    expect(onMouseUpCallback).toHaveBeenCalledTimes(1)

    // pointer up after the long press — released as a long press
    element.dispatchEvent(new PointerEvent('pointerup', { cancelable: true, bubbles: true }))
    expect(onMouseUpCallback).toHaveBeenCalledTimes(2)
    expect(onMouseUpCallback).toHaveBeenLastCalledWith(expect.any(Number), 0, true, expect.any(PointerEvent))
  }

  async function notTriggerCallbackOnPointerCancel() {
    const onLongPressCallback = vi.fn()
    const onMouseUpCallback = vi.fn()
    await renderHook(() => useLongPress(elementRef, onLongPressCallback, { onMouseUp: onMouseUpCallback }))

    element.dispatchEvent(new PointerEvent('pointerdown', { cancelable: true, bubbles: true }))

    await vi.advanceTimersByTimeAsync(250)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)

    // the user agent takes the gesture over, e.g. a second pointer starting a pinch
    element.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }))
    expect(onMouseUpCallback).toHaveBeenCalledTimes(1)
    expect(onMouseUpCallback).toHaveBeenCalledWith(expect.any(Number), 0, false, expect.any(PointerEvent))

    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)
  }

  async function stopEventListeners() {
    const onLongPressCallback = vi.fn()
    let stop: (() => void) | undefined
    await renderHook(() => {
      stop = useLongPress(elementRef, onLongPressCallback)
    })

    // before calling stop, the callback should be called
    element.dispatchEvent(pointerdownEvent)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(1)

    stop?.()

    // after calling stop, the callback should no longer be called
    onLongPressCallback.mockClear()
    element.dispatchEvent(pointerdownEvent)
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)
  }

  async function stopClearsPendingTimer() {
    const onLongPressCallback = vi.fn()
    let stop: (() => void) | undefined
    await renderHook(() => {
      stop = useLongPress(elementRef, onLongPressCallback)
    })

    element.dispatchEvent(pointerdownEvent)
    await vi.advanceTimersByTimeAsync(300)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)

    stop?.()

    // no pending timer should fire after being stopped
    await vi.advanceTimersByTimeAsync(500)
    expect(onLongPressCallback).toHaveBeenCalledTimes(0)
  }

  function suites() {
    describe('given no options', () => {
      it('should trigger longpress after 500ms', () => triggerCallback())
    })

    describe('given options', () => {
      it('should trigger longpress after options.delay ms', () => triggerCallbackWithDelay())

      it('should trigger longpress after options.delay ms when options.delay is a function', () => triggerCallbackWithDelayFunction())

      it('should not trigger longpress when child element on longpress', () => notTriggerCallbackOnChildLongPress())

      it('should work with once and prevent modifiers', () => workOnceAndPreventModifiers())

      it('should stop propagation', () => stopPropagation())

      it('should use capture mode', () => captureModifier())

      it('should trigger longpress if the pointer is moved within the distance threshold', () => triggerCallbackWithDistanceThreshold())

      it('should ignore pointer movement when distanceThreshold is false', () => ignoreMovementWithDisabledDistanceThreshold())

      it('should not trigger onMouseUp when the pointer moved beyond the distance threshold', () => notTriggerOnMouseUpAfterMovingTooFar())

      it('should trigger onMouseUp with duration, distance and isLongPress when the pointer is released', () => triggerOnMouseUp())

      it('should not trigger longpress when the pointer is canceled', () => notTriggerCallbackOnPointerCancel())

      it('should remove event listeners after being stopped', () => stopEventListeners())

      it('should clear the pending timer after being stopped', () => stopClearsPendingTimer())
    })
  }

  it('should be defined', () => {
    expect(useLongPress).toBeDefined()
  })

  describe('given the target is a ref', () => suites())
})
