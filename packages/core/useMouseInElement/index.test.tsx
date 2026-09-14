import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useMouseInElement } from '../useMouseInElement'

function createElement(x: number, y: number, width: number, height: number) {
  const div = document.createElement('div')
  div.style.position = 'relative'
  div.style.left = `${x}px`
  div.style.top = `${y}px`
  div.style.width = `${width}px`
  div.style.height = `${height}px`

  document.body.appendChild(div)
  return div
}

function createInlineElement(x: number, y: number) {
  const parent = createElement(0, 0, 50, 50)
  const span = document.createElement('span')
  span.style.position = 'relative'
  span.style.left = `${x}px`
  span.style.top = `${y}px`
  span.style.lineHeight = '2'
  span.textContent = 'Hello World'

  parent.appendChild(span)
  return span
}

function mockMouseMoveEvent(x: number, y: number) {
  return new MouseEvent('mousemove', { clientX: x, clientY: y })
}

describe('useMouseInElement', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('basic usage - block element', async () => {
    const x = 10
    const y = 10
    const width = 100
    const height = 100
    const target = createElement(x, y, width, height)
    const targetRef = { current: target }

    // `x`, `y`, `sourceType` are not fully tested here because they are
    // re-exported from the upstream `useMouse` port.
    const { result, act, unmount } = await renderHook(() => useMouseInElement(targetRef))

    expect(result.current.elementWidth).toBe(width)
    expect(result.current.elementHeight).toBe(height)
    expect(result.current.elementPositionX).toBe(x)
    expect(result.current.elementPositionY).toBe(y)
    expect(result.current.elementX).toBe(-x)
    expect(result.current.elementY).toBe(-y)
    expect(result.current.isOutside).toBe(true)

    const moveX = 20
    const moveY = 20
    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(moveX, moveY))
    })

    expect(result.current.x).toBe(moveX)
    expect(result.current.y).toBe(moveY)
    expect(result.current.sourceType).toBe('mouse')
    expect(result.current.elementX).toBe(moveX - x)
    expect(result.current.elementY).toBe(moveY - y)
    expect(result.current.isOutside).toBe(false)

    await act(() => {
      result.current.stop()
    })
    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(0, 0))
    })

    expect(result.current.elementX).toBe(moveX - x)
    expect(result.current.elementY).toBe(moveY - y)
    expect(result.current.isOutside).toBe(false)

    unmount()
  })

  it('basic usage - inline element', async () => {
    const target = createInlineElement(5, 0)
    const targetRef = { current: target }
    const { result, act, unmount } = await renderHook(() => useMouseInElement(targetRef))

    expect(result.current.isOutside).toBe(true)

    // move to first line - `Hello`
    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(10, 10))
    })
    expect(result.current.isOutside).toBe(false)

    // move to gap
    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(10, 30))
    })
    expect(result.current.isOutside).toBe(true)

    // move to second line - `World`
    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(10, 40))
    })
    expect(result.current.isOutside).toBe(false)

    // move out
    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(10, 80))
    })
    expect(result.current.isOutside).toBe(true)

    unmount()
  })

  it('keeps elementX/elementY frozen while outside with handleOutside: false', async () => {
    const target = createElement(10, 10, 100, 100)
    const targetRef = { current: target }
    const { result, act, unmount } = await renderHook(() => useMouseInElement(targetRef, { handleOutside: false }))

    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(20, 20))
    })
    expect(result.current.isOutside).toBe(false)
    expect(result.current.elementX).toBe(10)
    expect(result.current.elementY).toBe(10)

    // move outside — elementX/elementY keep their last inside values
    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(500, 500))
    })
    expect(result.current.isOutside).toBe(true)
    expect(result.current.elementX).toBe(10)
    expect(result.current.elementY).toBe(10)

    unmount()
  })

  it('forwards a custom `type` extractor to useMouse', async () => {
    const target = createElement(10, 10, 100, 100)
    const targetRef = { current: target }
    const { result, act, unmount } = await renderHook(() =>
      useMouseInElement(targetRef, {
        type: event => [event.clientX + 100, event.clientY + 200],
      }),
    )

    await act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 7, clientY: 9 }))
    })

    expect(result.current.x).toBe(107)
    expect(result.current.y).toBe(209)

    unmount()
  })

  it('listens on the `target` option instead of `window`', async () => {
    const target = createElement(0, 0, 100, 100)
    const listener = createElement(0, 0, 10, 10)
    const targetRef = { current: target }
    const listenerRef = { current: listener }
    const { result, act, unmount } = await renderHook(() => useMouseInElement(targetRef, { target: listenerRef }))

    // a non-bubbling event reaches only the `target` option element
    await act(() => {
      listener.dispatchEvent(new MouseEvent('mousemove', { clientX: 33, clientY: 44 }))
    })
    expect(result.current.x).toBe(33)
    expect(result.current.y).toBe(44)

    // `window` is no longer listened to
    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(1, 2))
    })
    expect(result.current.x).toBe(33)
    expect(result.current.y).toBe(44)

    unmount()
  })

  it('honors the `eventFilter` option', async () => {
    const target = createElement(0, 0, 100, 100)
    const targetRef = { current: target }
    let filtered = 0
    const { result, act, unmount } = await renderHook(() =>
      useMouseInElement(targetRef, {
        eventFilter: () => {
          filtered += 1
        },
      }),
    )

    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(20, 20))
    })

    expect(filtered).toBe(1)
    expect(result.current.x).toBe(0)
    expect(result.current.y).toBe(0)

    unmount()
  })

  it('only registers the `touchend` reset inside the touch gate', async () => {
    const target = createElement(0, 0, 100, 100)
    const targetRef = { current: target }
    const { result, act, unmount } = await renderHook(() =>
      useMouseInElement(targetRef, {
        touch: false,
        resetOnTouchEnds: true,
        initialValue: { x: 5, y: 6 },
      }),
    )

    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(20, 20))
    })
    expect(result.current.x).toBe(20)
    expect(result.current.y).toBe(20)

    // upstream registers the reset listener only when `touch && type !== 'movement'`
    await act(() => {
      window.dispatchEvent(new Event('touchend'))
    })
    expect(result.current.x).toBe(20)
    expect(result.current.y).toBe(20)

    unmount()
  })

  it('resets to `initialValue` on `touchend` when touch is enabled', async () => {
    const target = createElement(0, 0, 100, 100)
    const targetRef = { current: target }
    const { result, act, unmount } = await renderHook(() =>
      useMouseInElement(targetRef, {
        resetOnTouchEnds: true,
        initialValue: { x: 5, y: 6 },
      }),
    )

    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(20, 20))
    })
    expect(result.current.x).toBe(20)

    await act(() => {
      window.dispatchEvent(new Event('touchend'))
    })
    expect(result.current.x).toBe(5)
    expect(result.current.y).toBe(6)

    unmount()
  })

  it('keeps useMouse tracking and document mouseleave alive after stop()', async () => {
    const target = createElement(10, 10, 100, 100)
    const targetRef = { current: target }
    const { result, act, unmount } = await renderHook(() => useMouseInElement(targetRef))

    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(20, 20))
    })
    expect(result.current.x).toBe(20)
    expect(result.current.isOutside).toBe(false)

    await act(() => {
      result.current.stop()
    })

    // the composed `useMouse` listeners keep running (upstream parity)
    await act(() => {
      window.dispatchEvent(mockMouseMoveEvent(40, 40))
    })
    expect(result.current.x).toBe(40)
    expect(result.current.y).toBe(40)
    // ...but the element metrics are frozen
    expect(result.current.elementX).toBe(10)
    expect(result.current.elementY).toBe(10)
    expect(result.current.isOutside).toBe(false)

    // the document `mouseleave` handler also survives `stop()`
    await act(() => {
      document.dispatchEvent(new MouseEvent('mouseleave'))
    })
    expect(result.current.isOutside).toBe(true)

    unmount()
  })
})
