import type { RefObject } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { usePointer } from '../usePointer'

function createPointerEvent(type: string, init: PointerEventInit = {}) {
  const event = new PointerEvent(type, { bubbles: true, pointerType: 'mouse', ...init })
  // WebKit derives `tiltX`/`tiltY` from its own internal pointer state and
  // ignores them in `PointerEventInit`, so the requested values are pinned onto
  // the event (the hook only reads these properties).
  for (const key of ['tiltX', 'tiltY'] as const) {
    const value = init[key]
    if (value !== undefined && event[key] !== value)
      Object.defineProperty(event, key, { value, configurable: true })
  }
  return event
}

/**
 * Minimal `Window` test double that records listeners so a custom `window`
 * option can be exercised without touching the real global window.
 */
function createFakeWindow() {
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

  return {
    window: {
      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        const set = listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>()
        set.add(listener)
        listeners.set(type, set)
      },
      removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        listeners.get(type)?.delete(listener)
      },
    } as unknown as Window,
    dispatch(type: string, init: PointerEventInit = {}) {
      const event = createPointerEvent(type, init)
      listeners.get(type)?.forEach(listener =>
        typeof listener === 'function' ? listener(event) : listener.handleEvent(event),
      )
    },
    listenerCount(type: string) {
      return listeners.get(type)?.size ?? 0
    },
  }
}

describe('usePointer', () => {
  it('returns the default state before any pointer event', async () => {
    const { result } = await renderHook(() => usePointer())

    expect(result.current).toEqual({
      x: 0,
      y: 0,
      pointerId: 0,
      pressure: 0,
      tiltX: 0,
      tiltY: 0,
      width: 0,
      height: 0,
      twist: 0,
      pointerType: null,
      isInside: false,
    })
  })

  it('updates the full state on pointermove', async () => {
    const { result, act } = await renderHook(() => usePointer())

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointermove', {
        clientX: 120,
        clientY: 80,
        pointerId: 7,
        pressure: 0.5,
        pointerType: 'mouse',
        tiltX: 3,
        tiltY: 4,
        width: 10,
        height: 10,
        twist: 45,
      }))
    })

    await expect.poll(() => result.current.x).toBe(120)
    expect(result.current.y).toBe(80)
    expect(result.current.pointerId).toBe(7)
    expect(result.current.pressure).toBe(0.5)
    expect(result.current.pointerType).toBe('mouse')
    expect(result.current.tiltX).toBe(3)
    expect(result.current.tiltY).toBe(4)
    expect(result.current.width).toBe(10)
    expect(result.current.height).toBe(10)
    expect(result.current.twist).toBe(45)
    expect(result.current.isInside).toBe(true)
  })

  it('updates the state on pointerup', async () => {
    const { result, act } = await renderHook(() => usePointer())

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointerup', {
        clientX: 15,
        clientY: 25,
        pointerId: 3,
        pressure: 0,
      }))
    })

    await expect.poll(() => result.current.x).toBe(15)
    expect(result.current.y).toBe(25)
    expect(result.current.pointerId).toBe(3)
    expect(result.current.pressure).toBe(0)
  })

  it('sets isInside true on pointerdown and resets it on pointercancel', async () => {
    const { result, act } = await renderHook(() => usePointer())

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointerdown'))
    })
    await expect.poll(() => result.current.isInside).toBe(true)

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointercancel'))
    })
    await expect.poll(() => result.current.isInside).toBe(false)
  })

  it('resets isInside on pointerleave', async () => {
    const { result, act } = await renderHook(() => usePointer())

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointerdown'))
    })
    await expect.poll(() => result.current.isInside).toBe(true)

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointerleave'))
    })
    await expect.poll(() => result.current.isInside).toBe(false)
  })

  it('filters pointer events by pointerTypes but still marks isInside', async () => {
    const { result, act } = await renderHook(() => usePointer({ pointerTypes: ['mouse'] }))

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointerdown', {
        pointerType: 'touch',
        clientX: 5,
        clientY: 6,
        pointerId: 2,
      }))
    })
    await expect.poll(() => result.current.isInside).toBe(true)
    expect(result.current.x).toBe(0)
    expect(result.current.pointerId).toBe(0)

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointermove', {
        pointerType: 'mouse',
        clientX: 42,
        clientY: 43,
      }))
    })
    await expect.poll(() => result.current.x).toBe(42)
    expect(result.current.pointerId).not.toBe(2)
  })

  it('supports the initialValue option', async () => {
    const { result } = await renderHook(() => usePointer({
      initialValue: { x: 11, y: 22, pointerType: 'pen' },
    }))

    expect(result.current.x).toBe(11)
    expect(result.current.y).toBe(22)
    expect(result.current.pointerType).toBe('pen')
    expect(result.current.pressure).toBe(0)
    expect(result.current.isInside).toBe(false)
  })

  it('attaches its listeners to a custom target element', async () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    const targetRef = { current: element }

    const { result, act, unmount } = await renderHook(() => usePointer({ target: targetRef }))

    await act(() => {
      element.dispatchEvent(createPointerEvent('pointerdown'))
    })
    await expect.poll(() => result.current.isInside).toBe(true)

    await act(() => {
      element.dispatchEvent(createPointerEvent('pointerleave'))
    })
    await expect.poll(() => result.current.isInside).toBe(false)

    unmount()
    element.remove()
  })

  it('attaches its listeners to a ref target object', async () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    document.body.append(first, second)

    const target = { current: first as EventTarget | null }

    const { result, act, rerender, unmount } = await renderHook(
      (props?: { target?: { current: EventTarget | null } }) => usePointer(props),
      { initialProps: { target } },
    )

    await act(() => {
      first.dispatchEvent(createPointerEvent('pointermove', { clientX: 3, clientY: 4 }))
    })
    await expect.poll(() => result.current.x).toBe(3)

    // mutating `.current` plus a re-render re-resolves the target (React
    // ref semantics: the ref object itself is a stable dependency)
    target.current = second
    await rerender({ target })

    await act(() => {
      first.dispatchEvent(createPointerEvent('pointermove', { clientX: 99, clientY: 99 }))
    })
    expect(result.current.x).toBe(3)

    await act(() => {
      second.dispatchEvent(createPointerEvent('pointermove', { clientX: 7, clientY: 8 }))
    })
    await expect.poll(() => result.current.x).toBe(7)

    unmount()
    first.remove()
    second.remove()
  })

  it('disables listening when the target ref holds null', async () => {
    const { result, act } = await renderHook(() => usePointer({ target: { current: null } }))

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointermove', { clientX: 500, clientY: 500 }))
    })

    expect(result.current.x).toBe(0)
    expect(result.current.y).toBe(0)
    expect(result.current.isInside).toBe(false)
  })

  it('supports the window option instead of the global window', async () => {
    const fake = createFakeWindow()

    const { result, act } = await renderHook(() => usePointer({ window: fake.window }))

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointermove', { clientX: 500, clientY: 500 }))
    })
    expect(result.current.x).toBe(0)
    expect(result.current.isInside).toBe(false)

    await act(() => {
      fake.dispatch('pointermove', { clientX: 12, clientY: 34, pointerId: 9 })
    })
    await expect.poll(() => result.current.x).toBe(12)
    expect(result.current.y).toBe(34)
    expect(result.current.pointerId).toBe(9)
    expect(result.current.isInside).toBe(true)

    await act(() => {
      fake.dispatch('pointerleave')
    })
    await expect.poll(() => result.current.isInside).toBe(false)
  })

  it('rebinds its listeners when the window option changes', async () => {
    const first = createFakeWindow()
    const second = createFakeWindow()

    const { result, act, rerender } = await renderHook(
      (props?: { window?: Window }) => usePointer(props),
      { initialProps: { window: first.window } },
    )

    await act(() => {
      first.dispatch('pointermove', { clientX: 10, clientY: 20 })
    })
    await expect.poll(() => result.current.x).toBe(10)
    expect(first.listenerCount('pointermove')).toBe(1)

    await rerender({ window: second.window })

    expect(first.listenerCount('pointermove')).toBe(0)

    await act(() => {
      first.dispatch('pointermove', { clientX: 99, clientY: 99 })
    })
    expect(result.current.x).toBe(10)

    await act(() => {
      second.dispatch('pointermove', { clientX: 30, clientY: 40 })
    })
    await expect.poll(() => result.current.x).toBe(30)
  })

  it('re-subscribes when the target option changes', async () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    document.body.append(first, second)

    const { result, act, rerender, unmount } = await renderHook(
      (props?: { target?: RefObject<EventTarget | null | undefined> }) => usePointer(props),
      { initialProps: { target: { current: first } } },
    )

    await act(() => {
      first.dispatchEvent(createPointerEvent('pointermove', { clientX: 1, clientY: 2 }))
    })
    await expect.poll(() => result.current.x).toBe(1)

    await rerender({ target: { current: second } })

    await act(() => {
      first.dispatchEvent(createPointerEvent('pointermove', { clientX: 33, clientY: 34 }))
    })
    expect(result.current.x).toBe(1)

    await act(() => {
      second.dispatchEvent(createPointerEvent('pointermove', { clientX: 8, clientY: 9 }))
    })
    await expect.poll(() => result.current.x).toBe(8)

    unmount()
    first.remove()
    second.remove()
  })

  it('removes its listeners on unmount', async () => {
    const { result, act, unmount } = await renderHook(() => usePointer())
    unmount()

    await act(() => {
      window.dispatchEvent(createPointerEvent('pointermove', { clientX: 999, clientY: 999 }))
    })

    expect(result.current.x).toBe(0)
    expect(result.current.y).toBe(0)
    expect(result.current.isInside).toBe(false)
  })
})
