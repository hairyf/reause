import type { MousePressedOptions, UseMousePressedReturn } from '../useMousePressed'
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useMousePressed } from '../useMousePressed'

type expectSourceType = 'mouse' | 'touch' | null
/**
 * assert return values of useMousePressed
 */
function assertReturnValue(options: { returnValue: UseMousePressedReturn, expect: { pressed: boolean, sourceType: expectSourceType } }) {
  const { returnValue: { pressed, sourceType } } = options
  expect(pressed).toBe(options.expect.pressed)
  expect(sourceType).toBe(options.expect.sourceType)
}
/**
 * simulate press and release events
 */
async function pressAndReleaseByEvent(options: { triggerEvent: keyof WindowEventMap, cleanupEvent: keyof WindowEventMap, expect: { sourceType: expectSourceType } }) {
  const { triggerEvent, cleanupEvent, expect: { sourceType } } = options
  const { result, act } = await renderHook(() => useMousePressed())
  await act(() => {
    window.dispatchEvent(new Event(triggerEvent))
  })
  assertReturnValue({ returnValue: result.current, expect: { pressed: true, sourceType } })

  await act(() => {
    window.dispatchEvent(new Event(cleanupEvent))
  })
  assertReturnValue({ returnValue: result.current, expect: { pressed: false, sourceType: null } })
}

describe('useMousePressed', () => {
  it('should be defined', () => {
    expect(useMousePressed).toBeDefined()
  })

  it('supports a controllable initialValue tuple', async () => {
    let external = false
    const setExternal = (next: boolean | ((prev: boolean) => boolean)) => {
      external = typeof next === 'function' ? next(external) : next
    }
    const { result, act } = await renderHook(() => useMousePressed({ initialValue: [external, setExternal] }))
    expect(result.current.pressed).toBe(false)
    await act(() => window.dispatchEvent(new Event('mousedown')))
    expect(external).toBe(true)
  })

  it('exports the deprecated MousePressedOptions alias', async () => {
    const options: MousePressedOptions = { touch: false, drag: false }
    const { result, act } = await renderHook(() => useMousePressed(options))

    await act(() => {
      window.dispatchEvent(new Event('touchstart'))
    })
    assertReturnValue({ returnValue: result.current, expect: { pressed: false, sourceType: null } })

    await act(() => {
      window.dispatchEvent(new Event('mousedown'))
    })
    assertReturnValue({ returnValue: result.current, expect: { pressed: true, sourceType: 'mouse' } })
  })

  describe('params', () => {
    describe('initial value', () => {
      it('default value', async () => {
        const { result } = await renderHook(() => useMousePressed())
        assertReturnValue({ returnValue: result.current, expect: { pressed: false, sourceType: null } })
      })

      it('custom value', async () => {
        const { result } = await renderHook(() => useMousePressed({ initialValue: true }))
        assertReturnValue({ returnValue: result.current, expect: { pressed: true, sourceType: null } })
      })
    })

    describe('target', () => {
      it('does\'t has a target element', async () => {
        const { result, act } = await renderHook(() => useMousePressed())
        await act(() => {
          window.dispatchEvent(new Event('mousedown'))
        })
        assertReturnValue({ returnValue: result.current, expect: { pressed: true, sourceType: 'mouse' } })
      })

      it('has a target element', async () => {
        const targetEle = document.createElement('button')
        const targetRef = { current: targetEle }
        const { result, act } = await renderHook(() => useMousePressed({ target: targetRef }))
        await act(() => {
          targetEle.dispatchEvent(new Event('dragstart'))
        })
        assertReturnValue({ returnValue: result.current, expect: { pressed: true, sourceType: 'mouse' } })
      })
    })

    describe('window', () => {
      it('treats an explicit null window as inert', async () => {
        const onPressed = vi.fn()
        const onReleased = vi.fn()
        const { result, act } = await renderHook(() => useMousePressed({
          window: null as unknown as Window,
          onPressed,
          onReleased,
        }))

        await act(() => {
          window.dispatchEvent(new Event('mousedown'))
        })
        await act(() => {
          window.dispatchEvent(new Event('touchstart'))
        })
        await act(() => {
          window.dispatchEvent(new Event('mouseup'))
        })

        assertReturnValue({ returnValue: result.current, expect: { pressed: false, sourceType: null } })
        expect(onPressed).not.toHaveBeenCalled()
        expect(onReleased).not.toHaveBeenCalled()
      })

      it('keeps the initial value when an explicit null window attaches no listeners', async () => {
        const { result, act } = await renderHook(() => useMousePressed({
          initialValue: true,
          window: null as unknown as Window,
        }))
        assertReturnValue({ returnValue: result.current, expect: { pressed: true, sourceType: null } })

        await act(() => {
          window.dispatchEvent(new Event('mouseup'))
        })
        assertReturnValue({ returnValue: result.current, expect: { pressed: true, sourceType: null } })
      })
    })

    it('onPressed & onReleased callback', async () => {
      const onPressed = vi.fn()
      const onReleased = vi.fn()
      const { act } = await renderHook(() => useMousePressed({ onPressed, onReleased }))

      await act(() => {
        window.dispatchEvent(new MouseEvent('mousedown'))
      })
      expect(onPressed).toHaveBeenCalled()

      await act(() => {
        window.dispatchEvent(new MouseEvent('mouseup'))
      })
      expect(onReleased).toHaveBeenCalled()
    })
  })

  describe('trigger & cleanup events', () => {
    describe('mouse event', () => {
      it('mouseup', async () => {
        await pressAndReleaseByEvent({ triggerEvent: 'mousedown', cleanupEvent: 'mouseup', expect: { sourceType: 'mouse' } })
      })

      it('mouseleave', async () => {
        await pressAndReleaseByEvent({ triggerEvent: 'mousedown', cleanupEvent: 'mouseleave', expect: { sourceType: 'mouse' } })
      })
    })

    describe('drag event', () => {
      it('drop', async () => {
        await pressAndReleaseByEvent({ triggerEvent: 'dragstart', cleanupEvent: 'drop', expect: { sourceType: 'mouse' } })
      })

      it('dragend', async () => {
        await pressAndReleaseByEvent({ triggerEvent: 'dragstart', cleanupEvent: 'dragend', expect: { sourceType: 'mouse' } })
      })
    })

    describe('touch event', () => {
      it('touchend', async () => {
        await pressAndReleaseByEvent({ triggerEvent: 'touchstart', cleanupEvent: 'touchend', expect: { sourceType: 'touch' } })
      })

      it('touchcancel', async () => {
        await pressAndReleaseByEvent({ triggerEvent: 'touchstart', cleanupEvent: 'touchcancel', expect: { sourceType: 'touch' } })
      })
    })
  })
})
