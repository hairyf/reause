import type { RefObject } from 'react'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useElementHover } from '../useElementHover'

/**
 * The hook binds DOM targets to React refs only — a plain element, a getter or
 * a callback ref is not accepted, so every test wraps its element in a
 * `{ current }` holder.
 */
function refOf<T>(value: T | null): RefObject<T | null> {
  return { current: value }
}

describe('useElementHover', () => {
  it('should be defined', () => {
    expect(useElementHover).toBeDefined()
  })

  it('accepts only a React ref object as the DOM target', () => {
    expectTypeOf<Parameters<typeof useElementHover>[0]>()
      .toEqualTypeOf<RefObject<EventTarget | null | undefined>>()
    // a plain element is deliberately rejected — refs are the only DOM target
    expectTypeOf<HTMLButtonElement>()
      .not
      .toMatchTypeOf<Parameters<typeof useElementHover>[0]>()
    // the callback form of React's `Ref<T>` is rejected too
    expectTypeOf<(instance: EventTarget | null) => void>()
      .not
      .toMatchTypeOf<Parameters<typeof useElementHover>[0]>()
  })

  it('should initialize with false by default', async () => {
    const el = document.createElement('button')
    const { result } = await renderHook(() => useElementHover(refOf(el)))
    expect(result.current).toBe(false)
  })

  it('should be SSR-safe: stays false while no target element is resolved', async () => {
    const el = document.createElement('button')
    const { result, act } = await renderHook(() => useElementHover({ current: null }))
    expect(result.current).toBe(false)

    // no listeners are attached while there is no target, so events on other
    // elements or the document never flip the state
    await act(() => {
      el.dispatchEvent(new MouseEvent('mouseenter'))
      document.dispatchEvent(new MouseEvent('mouseenter'))
    })
    expect(result.current).toBe(false)
  })

  it('should track hover on a ref target', async () => {
    const el = document.createElement('button')
    const { result, act } = await renderHook(() => useElementHover(refOf(el)))

    await act(() => {
      el.dispatchEvent(new MouseEvent('mouseenter'))
    })
    expect(result.current).toBe(true)

    await act(() => {
      el.dispatchEvent(new MouseEvent('mouseleave'))
    })
    expect(result.current).toBe(false)
  })

  it('should accept a ref object as target', async () => {
    const el = document.createElement('button')
    const target = refOf<EventTarget>(el)
    const { result, act } = await renderHook(() => useElementHover(target))

    await act(() => {
      el.dispatchEvent(new MouseEvent('mouseenter'))
    })
    expect(result.current).toBe(true)
  })

  it('should follow the ref when its element swaps between renders', async () => {
    const first = document.createElement('button')
    const second = document.createElement('button')
    const { result, act, rerender } = await renderHook(
      (props?: { target: RefObject<EventTarget | null> }) =>
        useElementHover(props?.target ?? refOf<EventTarget>(null)),
      { initialProps: { target: refOf<EventTarget>(first) } },
    )

    await act(() => {
      first.dispatchEvent(new MouseEvent('mouseenter'))
    })
    expect(result.current).toBe(true)

    // swapping the ref re-attaches the listeners to the new element
    await rerender({ target: refOf<EventTarget>(second) })

    await act(() => {
      first.dispatchEvent(new MouseEvent('mouseleave'))
    })
    expect(result.current).toBe(true)

    await act(() => {
      second.dispatchEvent(new MouseEvent('mouseleave'))
    })
    expect(result.current).toBe(false)
  })

  it('should track hover with a custom window instance', async () => {
    // upstream gates the whole hook on `window` being truthy — a custom
    // instance enables tracking without relying on the global window
    const el = document.createElement('button')
    const customWindow = new EventTarget() as unknown as Window
    const { result, act } = await renderHook(() => useElementHover(refOf(el), { window: customWindow }))

    await act(() => {
      el.dispatchEvent(new MouseEvent('mouseenter'))
    })
    expect(result.current).toBe(true)

    await act(() => {
      el.dispatchEvent(new MouseEvent('mouseleave'))
    })
    expect(result.current).toBe(false)
  })

  it('should disable tracking entirely when window is null', async () => {
    // upstream: `window = defaultWindow; if (!window) return isHovered` —
    // an explicit `null` window must not silently fall back to the global
    // window; no listeners are attached and the state stays `false`
    const el = document.createElement('button')
    const { result, act } = await renderHook(() => useElementHover(refOf(el), { window: null as unknown as Window }))

    await act(() => {
      el.dispatchEvent(new MouseEvent('mouseenter'))
      el.dispatchEvent(new MouseEvent('mouseleave'))
      document.dispatchEvent(new MouseEvent('mouseenter'))
    })
    expect(result.current).toBe(false)
  })

  it('should toggle hover state on mouseenter / mouseleave', async () => {
    const el = document.createElement('button')
    const { result, act } = await renderHook(() => useElementHover(refOf(el)))
    expect(result.current).toBe(false)

    await act(() => {
      el.dispatchEvent(new MouseEvent('mouseenter'))
    })
    expect(result.current).toBe(true)

    await act(() => {
      el.dispatchEvent(new MouseEvent('mouseleave'))
    })
    expect(result.current).toBe(false)
  })

  it('should reset the hover state when the element is removed with triggerOnRemoval', async () => {
    const el = document.createElement('button')
    document.body.appendChild(el)
    const { result, act } = await renderHook(() => useElementHover(refOf(el), { triggerOnRemoval: true }))

    await act(() => {
      el.dispatchEvent(new MouseEvent('mouseenter'))
    })
    expect(result.current).toBe(true)

    await act(async () => {
      el.remove()
    })
    expect(result.current).toBe(false)
  })

  describe('delay', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should delay entering with delayEnter', async () => {
      const el = document.createElement('button')
      const { result, act } = await renderHook(() => useElementHover(refOf(el), { delayEnter: 100 }))

      await act(() => {
        el.dispatchEvent(new MouseEvent('mouseenter'))
      })
      expect(result.current).toBe(false)

      await act(() => {
        vi.advanceTimersByTime(99)
      })
      expect(result.current).toBe(false)

      await act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(result.current).toBe(true)
    })

    it('should delay leaving with delayLeave', async () => {
      const el = document.createElement('button')
      const { result, act } = await renderHook(() => useElementHover(refOf(el), { delayLeave: 100 }))

      await act(() => {
        el.dispatchEvent(new MouseEvent('mouseenter'))
      })
      expect(result.current).toBe(true)

      await act(() => {
        el.dispatchEvent(new MouseEvent('mouseleave'))
      })
      expect(result.current).toBe(true)

      await act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(result.current).toBe(false)
    })

    it('should cancel a pending timer on a new event', async () => {
      const el = document.createElement('button')
      const { result, act } = await renderHook(() => useElementHover(refOf(el), { delayEnter: 100, delayLeave: 100 }))

      await act(() => {
        el.dispatchEvent(new MouseEvent('mouseenter'))
      })

      // leave before the enter delay elapses: the pending timer is cancelled
      await act(() => {
        el.dispatchEvent(new MouseEvent('mouseleave'))
      })
      await act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(result.current).toBe(false)
    })
  })
})
