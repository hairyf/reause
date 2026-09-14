import type { RefObject } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useMouse } from '../useMouse'
import UseMouseDemo from './demo'

type FakeWindowListener = (event: Event) => void

// minimal window stand-in so the `window` option branches (custom window,
// rebinding, scroll compensation) are exercised without a real iframe
function createFakeWindow() {
  const listeners: Partial<Record<string, FakeWindowListener[]>> = {}
  const scroll = { x: 0, y: 0 }

  const win = {
    get scrollX() {
      return scroll.x
    },
    get scrollY() {
      return scroll.y
    },
    addEventListener: (type: string, listener: FakeWindowListener) => {
      (listeners[type] ??= []).push(listener)
    },
    removeEventListener: (type: string, listener: FakeWindowListener) => {
      listeners[type] = (listeners[type] ?? []).filter(item => item !== listener)
    },
  } as unknown as Window

  return { win, listeners, scroll }
}

function fire(listeners: FakeWindowListener[] | undefined, event: Event) {
  for (const listener of listeners ?? [])
    listener(event)
}

function createMouseEvent(type: string, init: MouseEventInit = {}) {
  return new MouseEvent(type, { bubbles: true, cancelable: true, ...init })
}

function createTouchEvent(type: string, x: number, y: number, target: EventTarget) {
  const event = new TouchEvent(type, { bubbles: true, cancelable: true })
  // WebKit's `Touch` constructor throws ("Illegal constructor") and the
  // `TouchEventInit` `touches` sequence rejects plain objects in every engine,
  // so the touch list is defined on the event instead of the init dict.
  const touch = { identifier: 0, target, pageX: x, pageY: y, clientX: x, clientY: y } as unknown as Touch
  Object.defineProperty(event, 'touches', { value: [touch], configurable: true })
  return event
}

// restore the mocked scroll coordinates after each test
const savedScroll: Array<{ x: number, y: number }> = []

afterEach(() => {
  for (const entry of savedScroll.splice(0)) {
    Object.defineProperty(window, 'scrollX', { value: entry.x, configurable: true, writable: true })
    Object.defineProperty(window, 'scrollY', { value: entry.y, configurable: true, writable: true })
  }
})

function mockScrollPosition(x: number, y: number) {
  savedScroll.push({ x: window.scrollX, y: window.scrollY })
  Object.defineProperty(window, 'scrollX', { value: x, configurable: true, writable: true })
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true })
}

describe('useMouse', () => {
  it('returns the default state before any event', async () => {
    const { result } = await renderHook(() => useMouse())

    expect(result.current).toEqual({ x: 0, y: 0, sourceType: null })
  })

  it('updates x / y / sourceType on window mousemove', async () => {
    const { result, act } = await renderHook(() => useMouse())

    await act(() => {
      window.dispatchEvent(createMouseEvent('mousemove', { clientX: 120, clientY: 80 }))
    })

    expect(result.current.x).toBe(120)
    expect(result.current.y).toBe(80)
    expect(result.current.sourceType).toBe('mouse')
  })

  it('tracks the cursor while dragging via dragover', async () => {
    const { result, act } = await renderHook(() => useMouse())

    await act(() => {
      window.dispatchEvent(createMouseEvent('dragover', { clientX: 40, clientY: 60 }))
    })

    expect(result.current.x).toBe(40)
    expect(result.current.y).toBe(60)
    expect(result.current.sourceType).toBe('mouse')
  })

  it('supports the client / screen / movement coord types', async () => {
    const client = await renderHook(() => useMouse({ type: 'client' }))
    await client.act(() => {
      window.dispatchEvent(createMouseEvent('mousemove', { clientX: 11, clientY: 22 }))
    })
    expect(client.result.current.x).toBe(11)
    expect(client.result.current.y).toBe(22)
    await client.unmount()

    const screen = await renderHook(() => useMouse({ type: 'screen' }))
    await screen.act(() => {
      window.dispatchEvent(createMouseEvent('mousemove', { screenX: 7, screenY: 9 }))
    })
    expect(screen.result.current.x).toBe(7)
    expect(screen.result.current.y).toBe(9)
    await screen.unmount()

    const movement = await renderHook(() => useMouse({ type: 'movement' }))
    await movement.act(() => {
      window.dispatchEvent(createMouseEvent('mousemove', { movementX: 3, movementY: 5 }))
    })
    expect(movement.result.current.x).toBe(3)
    expect(movement.result.current.y).toBe(5)
  })

  it('supports a custom extractor function', async () => {
    const { result, act } = await renderHook(() => useMouse({
      // transform the client coordinates — proves the extractor decides the value
      type: event => (event instanceof MouseEvent
        ? [event.clientX * 2, event.clientY * 2]
        : null),
    }))

    await act(() => {
      window.dispatchEvent(createMouseEvent('mousemove', { clientX: 13, clientY: 37 }))
    })

    expect(result.current.x).toBe(26)
    expect(result.current.y).toBe(74)
    expect(result.current.sourceType).toBe('mouse')
  })

  it('updates from touchmove with sourceType touch', async () => {
    const { result, act } = await renderHook(() => useMouse())

    await act(() => {
      window.dispatchEvent(createTouchEvent('touchmove', 90, 70, window))
    })

    expect(result.current.x).toBe(90)
    expect(result.current.y).toBe(70)
    expect(result.current.sourceType).toBe('touch')
  })

  it('ignores touch events when touch is false', async () => {
    const { result, act } = await renderHook(() => useMouse({ touch: false }))

    await act(() => {
      window.dispatchEvent(createTouchEvent('touchmove', 90, 70, window))
    })

    expect(result.current.x).toBe(0)
    expect(result.current.y).toBe(0)
    expect(result.current.sourceType).toBe(null)
  })

  it('resets to the initial value on touchend with resetOnTouchEnds', async () => {
    const { result, act } = await renderHook(() => useMouse({
      resetOnTouchEnds: true,
      initialValue: { x: 3, y: 4 },
    }))

    await act(() => {
      window.dispatchEvent(createTouchEvent('touchmove', 90, 70, window))
    })
    expect(result.current.x).toBe(90)
    expect(result.current.y).toBe(70)

    await act(() => {
      window.dispatchEvent(createTouchEvent('touchend', 0, 0, window))
    })

    expect(result.current.x).toBe(3)
    expect(result.current.y).toBe(4)
    expect(result.current.sourceType).toBe('touch')
  })

  it('ignores the touchend reset when touch is disabled', async () => {
    const { result, act } = await renderHook(() => useMouse({
      touch: false,
      resetOnTouchEnds: true,
      initialValue: { x: 3, y: 4 },
    }))

    await act(() => {
      window.dispatchEvent(createMouseEvent('mousemove', { clientX: 90, clientY: 70 }))
    })
    expect(result.current.x).toBe(90)
    expect(result.current.y).toBe(70)

    await act(() => {
      window.dispatchEvent(createTouchEvent('touchend', 0, 0, window))
    })

    // `touch: false` skips the whole touch block, so `touchend` never resets
    expect(result.current.x).toBe(90)
    expect(result.current.y).toBe(70)
    expect(result.current.sourceType).toBe('mouse')
  })

  it('uses initialValue as the initial state', async () => {
    const { result } = await renderHook(() => useMouse({ initialValue: { x: 11, y: 22 } }))

    expect(result.current.x).toBe(11)
    expect(result.current.y).toBe(22)
    expect(result.current.sourceType).toBe(null)
  })

  it('compensates page coordinates on window scroll', async () => {
    const { result, act } = await renderHook(() => useMouse())

    await act(() => {
      window.dispatchEvent(createMouseEvent('mousemove', { clientX: 100, clientY: 50 }))
    })
    expect(result.current.x).toBe(100)
    expect(result.current.y).toBe(50)

    mockScrollPosition(30, 20)
    await act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(result.current.x).toBe(130)
    expect(result.current.y).toBe(70)
    expect(result.current.sourceType).toBe('mouse')
  })

  it('does not compensate on window scroll when scroll is false', async () => {
    const { result, act } = await renderHook(() => useMouse({ scroll: false }))

    await act(() => {
      window.dispatchEvent(createMouseEvent('mousemove', { clientX: 100, clientY: 50 }))
    })
    expect(result.current.x).toBe(100)

    mockScrollPosition(30, 20)
    await act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(result.current.x).toBe(100)
    expect(result.current.y).toBe(50)
  })

  it('uses the custom window option for its listeners and scroll compensation', async () => {
    const { win, listeners, scroll } = createFakeWindow()

    const { result, act } = await renderHook(() => useMouse({ window: win }))

    expect(listeners.mousemove).toHaveLength(1)
    expect(listeners.scroll).toHaveLength(1)

    await act(() => {
      fire(listeners.mousemove, createMouseEvent('mousemove', { clientX: 100, clientY: 50 }))
    })
    expect(result.current.x).toBe(100)
    expect(result.current.y).toBe(50)

    scroll.x = 30
    scroll.y = 20
    await act(() => {
      fire(listeners.scroll, new Event('scroll'))
    })

    expect(result.current.x).toBe(130)
    expect(result.current.y).toBe(70)
  })

  it('attaches its listeners to a custom target element', async () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    const targetRef = { current: element }

    const { result, act, unmount } = await renderHook(() => useMouse({ target: targetRef }))

    await act(() => {
      element.dispatchEvent(createMouseEvent('mousemove', { clientX: 55, clientY: 66 }))
    })
    expect(result.current.x).toBe(55)
    expect(result.current.y).toBe(66)

    unmount()
    element.remove()
  })

  it('resolves a ref target at bind time, after it is populated', async () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    const targetRef: { current: EventTarget | null } = { current: null }

    const { result, act, rerender, unmount } = await renderHook(
      (props?: { current: EventTarget | null }) => useMouse({ target: props }),
      { initialProps: targetRef },
    )

    // same object identity with `current` still null — nothing is bound yet
    await act(() => {
      element.dispatchEvent(createMouseEvent('mousemove', { clientX: 1, clientY: 2 }))
    })
    expect(result.current.x).toBe(0)

    // populate `current` (simulating React attaching the element), then a
    // re-render re-resolves and binds
    targetRef.current = element
    await rerender(targetRef)
    await act(() => {
      element.dispatchEvent(createMouseEvent('mousemove', { clientX: 33, clientY: 44 }))
    })
    expect(result.current.x).toBe(33)
    expect(result.current.y).toBe(44)

    unmount()
    element.remove()
  })

  it('re-binds the listeners when the resolved target changes', async () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    document.body.append(first, second)

    const { result, act, rerender, unmount } = await renderHook(
      (props?: { target?: RefObject<EventTarget | null | undefined> }) => useMouse(props),
      { initialProps: { target: { current: first } } },
    )

    await act(() => {
      first.dispatchEvent(createMouseEvent('mousemove', { clientX: 1, clientY: 2 }))
    })
    expect(result.current.x).toBe(1)

    await rerender({ target: { current: second } })

    await act(() => {
      first.dispatchEvent(createMouseEvent('mousemove', { clientX: 33, clientY: 34 }))
    })
    expect(result.current.x).toBe(1)

    await act(() => {
      second.dispatchEvent(createMouseEvent('mousemove', { clientX: 8, clientY: 9 }))
    })
    expect(result.current.x).toBe(8)
    expect(result.current.y).toBe(9)

    unmount()
    first.remove()
    second.remove()
  })

  it('re-binds the listeners when the window option changes', async () => {
    const first = createFakeWindow()
    const second = createFakeWindow()

    const { result, act, rerender } = await renderHook(
      (props?: { window?: Window }) => useMouse(props),
      { initialProps: { window: first.win } },
    )

    await act(() => {
      fire(first.listeners.mousemove, createMouseEvent('mousemove', { clientX: 12, clientY: 34 }))
    })
    expect(result.current.x).toBe(12)

    await rerender({ window: second.win })

    // the old window is fully unsubscribed, the new one is live
    expect(first.listeners.mousemove).toHaveLength(0)
    expect(first.listeners.scroll).toHaveLength(0)
    expect(second.listeners.mousemove).toHaveLength(1)
    expect(second.listeners.scroll).toHaveLength(1)

    await act(() => {
      fire(first.listeners.mousemove, createMouseEvent('mousemove', { clientX: 99, clientY: 99 }))
    })
    expect(result.current.x).toBe(12)

    await act(() => {
      fire(second.listeners.mousemove, createMouseEvent('mousemove', { clientX: 5, clientY: 6 }))
    })
    expect(result.current.x).toBe(5)
    expect(result.current.y).toBe(6)
  })

  it('removes its listeners on unmount', async () => {
    const { result, act, unmount } = await renderHook(() => useMouse())
    unmount()

    await act(() => {
      window.dispatchEvent(createMouseEvent('mousemove', { clientX: 999, clientY: 999 }))
    })

    expect(result.current.x).toBe(0)
    expect(result.current.y).toBe(0)
    expect(result.current.sourceType).toBe(null)
  })

  it('passes a placeholder second argument to eventFilter (upstream parity)', async () => {
    const received: unknown[] = []

    const { result, act } = await renderHook(() => useMouse({
      eventFilter: (invoke, options) => {
        received.push(options)
        invoke()
      },
    }))

    await act(() => {
      window.dispatchEvent(createMouseEvent('mousemove', { clientX: 21, clientY: 43 }))
    })

    expect(result.current.x).toBe(21)
    expect(result.current.y).toBe(43)
    // upstream always passes a placeholder object (`{} as any`), never undefined
    expect(received).toEqual([{}])
  })

  it('is SSR safe — the render phase returns the defaults and attaches no listeners', async () => {
    const { win, listeners } = createFakeWindow()
    let firstRender: ReturnType<typeof useMouse> | undefined
    let listenersAtFirstRender = -1

    function Probe() {
      const mouse = useMouse({ window: win })
      if (!firstRender) {
        firstRender = mouse
        // snapshot taken during the render phase — the mount effect has not run
        listenersAtFirstRender = (listeners.mousemove?.length ?? 0) + (listeners.scroll?.length ?? 0)
      }
      return <div>{`${mouse.x},${mouse.y},${mouse.sourceType ?? 'null'}`}</div>
    }

    // server render runs no effects: the markup carries the defaults and the
    // window is never subscribed to
    const html = renderToString(<Probe />)
    expect(html).toContain('0,0,null')
    expect(listenersAtFirstRender).toBe(0)

    await render(<Probe />)

    // the client mount effect is what attaches exactly one mousemove + one
    // scroll listener
    expect(firstRender).toEqual({ x: 0, y: 0, sourceType: null })
    expect(listeners.mousemove).toHaveLength(1)
    expect(listeners.scroll).toHaveLength(1)
  })

  it('mirrors the upstream demo test — the demo renders', async () => {
    const screen = await render(<UseMouseDemo />)

    await expect.element(screen.baseElement).toBeInTheDocument()
  })
})
