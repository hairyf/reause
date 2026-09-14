import type { MockInstance } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useEventListener } from '../useEventListener'

describe('useEventListener', () => {
  const options = { capture: true }
  let target: HTMLDivElement
  let targetRef: { current: HTMLDivElement | null }
  let removeSpy: MockInstance
  let addSpy: MockInstance

  beforeEach(() => {
    target = document.createElement('div')
    targetRef = { current: target }
    removeSpy = vi.spyOn(target, 'removeEventListener')
    addSpy = vi.spyOn(target, 'addEventListener')
  })

  it('should be defined', () => {
    expect(useEventListener).toBeDefined()
  })

  describe('given both none array', () => {
    const listener = vi.fn()
    const event = 'click'

    beforeEach(() => {
      listener.mockReset()
    })

    it('should add listener', async () => {
      await renderHook(() => useEventListener(targetRef, event, listener, options))

      expect(addSpy).toBeCalledTimes(1)
    })

    it('should trigger listener', async () => {
      await renderHook(() => useEventListener(targetRef, event, listener, options))

      expect(listener).not.toBeCalled()
      target.dispatchEvent(new MouseEvent(event))
      expect(listener).toBeCalledTimes(1)
    })

    it('should remove listener', async () => {
      const { result } = await renderHook(() => useEventListener(targetRef, event, listener, options))

      expect(removeSpy).not.toBeCalled()

      result.current()

      expect(removeSpy).toBeCalledTimes(1)
      expect(removeSpy).toBeCalledWith(event, expect.any(Function), options)
    })
  })

  describe('given array of events but single listener', () => {
    const listener = vi.fn()
    const events = ['click', 'scroll', 'blur', 'resize']

    beforeEach(() => {
      listener.mockReset()
    })

    it('should add listener for all events', async () => {
      await renderHook(() => useEventListener(targetRef, events, listener, options))

      events.forEach(event => expect(addSpy).toBeCalledWith(event, expect.any(Function), options))
    })

    it('should trigger listener with all events', async () => {
      await renderHook(() => useEventListener(targetRef, events, listener, options))

      expect(listener).not.toBeCalled()
      events.forEach((event, index) => {
        target.dispatchEvent(new Event(event))
        expect(listener).toBeCalledTimes(index + 1)
      })
    })

    it('should remove listener with all events', async () => {
      const { result } = await renderHook(() => useEventListener(targetRef, events, listener, options))

      expect(removeSpy).not.toBeCalled()

      result.current()

      expect(removeSpy).toBeCalledTimes(events.length)
      events.forEach(event => expect(removeSpy).toBeCalledWith(event, expect.any(Function), options))
    })
  })

  describe('given single event but array of listeners', () => {
    const listeners = [vi.fn(), vi.fn(), vi.fn()]
    const event = 'click'

    beforeEach(() => {
      listeners.forEach(listener => listener.mockReset())
    })

    it('should add all listeners', async () => {
      await renderHook(() => useEventListener(targetRef, event, listeners, options))

      // one stable dispatcher per target+event fans out to every listener
      expect(addSpy).toBeCalledTimes(1)
      expect(addSpy).toBeCalledWith(event, expect.any(Function), options)
    })

    it('should call all listeners with single click event', async () => {
      await renderHook(() => useEventListener(targetRef, event, listeners, options))

      listeners.forEach(listener => expect(listener).not.toBeCalled())

      target.dispatchEvent(new Event(event))

      listeners.forEach(listener => expect(listener).toBeCalledTimes(1))
    })

    it('should remove listeners', async () => {
      const { result } = await renderHook(() => useEventListener(targetRef, event, listeners, options))

      expect(removeSpy).not.toBeCalled()

      result.current()

      expect(removeSpy).toBeCalledTimes(1)
      expect(removeSpy).toBeCalledWith(event, expect.any(Function), options)
    })
  })

  describe('given both array of events and listeners', () => {
    const listeners = [vi.fn(), vi.fn(), vi.fn()]
    const events = ['click', 'scroll', 'blur', 'resize', 'custom-event']

    beforeEach(() => {
      listeners.forEach(listener => listener.mockReset())
    })

    it('should add all listeners for all events', async () => {
      await renderHook(() => useEventListener(targetRef, events, listeners, options))

      events.forEach(event =>
        expect(addSpy).toBeCalledWith(event, expect.any(Function), options),
      )
    })

    it('should call all listeners with all events', async () => {
      await renderHook(() => useEventListener(targetRef, events, listeners, options))

      events.forEach((event, index) => {
        target.dispatchEvent(new Event(event))
        listeners.forEach(listener => expect(listener).toBeCalledTimes(index + 1))
      })
    })

    it('should remove all listeners with all events', async () => {
      const { result } = await renderHook(() => useEventListener(targetRef, events, listeners, options))

      result.current()

      events.forEach(event =>
        expect(removeSpy).toBeCalledWith(event, expect.any(Function), options),
      )
    })
  })

  describe('multiple events', () => {
    it('should not listen when target is invalid', async () => {
      const targetRef: { current: HTMLDivElement | null } = { current: document.createElement('div') }
      const listener = vi.fn()
      const { rerender } = await renderHook(() => useEventListener(targetRef, 'click', listener))

      const el = targetRef.current
      targetRef.current = null
      await rerender()
      el!.dispatchEvent(new MouseEvent('click'))

      expect(listener).toHaveBeenCalledTimes(0)
    })

    function getTargetName(useTarget: boolean) {
      return useTarget ? 'element' : 'window'
    }

    function renderTargetListener(
      useTarget: boolean,
      targetRef: { current: HTMLDivElement | null },
      listener: () => void,
    ) {
      return useTarget
        ? renderHook(() => useEventListener(targetRef, 'click', listener))
        : renderHook(() => useEventListener('click', listener))
    }

    function testTarget(useTarget: boolean) {
      it(`should ${getTargetName(useTarget)} listen event`, async () => {
        const targetRef = { current: document.createElement('div') }
        const listener = vi.fn()
        await renderTargetListener(useTarget, targetRef, listener)

        ;(useTarget ? targetRef.current : window)!.dispatchEvent(new MouseEvent('click'))

        expect(listener).toHaveBeenCalledTimes(1)
      })

      it(`should ${getTargetName(useTarget)} manually stop listening event`, async () => {
        const targetRef = { current: document.createElement('div') }
        const listener = vi.fn()
        const { result } = await renderTargetListener(useTarget, targetRef, listener)

        result.current()

        ;(useTarget ? targetRef.current : window)!.dispatchEvent(new MouseEvent('click'))

        expect(listener).toHaveBeenCalledTimes(0)
      })

      it(`should ${getTargetName(useTarget)} auto stop listening event`, async () => {
        const targetRef = { current: document.createElement('div') }
        const listener = vi.fn()
        const { unmount } = await renderTargetListener(useTarget, targetRef, listener)

        unmount()

        ;(useTarget ? targetRef.current : window)!.dispatchEvent(new MouseEvent('click'))

        expect(listener).toHaveBeenCalledTimes(0)
      })
    }

    testTarget(false)
    testTarget(true)
  })

  describe('useEventListener - multiple targets', () => {
    it('should accept an array ref of DOM elements', async () => {
      const listener = vi.fn()
      const el1 = document.createElement('button')
      const el2 = document.createElement('button')
      const arrayRef = { current: [el1, el2] }

      await renderHook(() => useEventListener(arrayRef, 'click', listener))

      el1.dispatchEvent(new Event('click'))
      el2.dispatchEvent(new Event('click'))
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('should accept a ref of multiple targets', async () => {
      const listener = vi.fn()
      const el1 = document.createElement('div')
      const el2 = document.createElement('div')
      const targetsRef: { current: HTMLElement[] } = { current: [el1, el2] }

      const { rerender } = await renderHook(() => useEventListener(targetsRef, 'mousedown', listener))

      el1.dispatchEvent(new Event('mousedown'))
      el2.dispatchEvent(new Event('mousedown'))
      expect(listener).toHaveBeenCalledTimes(2)

      // disable
      targetsRef.current = []
      await rerender()
      el1.dispatchEvent(new Event('mousedown'))
      el2.dispatchEvent(new Event('mousedown'))
      // events should no longer trigger
      expect(listener).toHaveBeenCalledTimes(2)
    })

    it('should accept an array of DOM elements + multiple events', async () => {
      const listener = vi.fn()
      const el1 = document.createElement('button')
      const el2 = document.createElement('button')
      const arrayRef = { current: [el1, el2] }

      await renderHook(() => useEventListener(arrayRef, ['click', 'hover'], listener))

      el1.dispatchEvent(new Event('click'))
      el2.dispatchEvent(new Event('click'))
      el1.dispatchEvent(new Event('hover'))
      el2.dispatchEvent(new Event('hover'))
      expect(listener).toHaveBeenCalledTimes(4)
    })

    it('should accept a ref of multiple targets + multiple events', async () => {
      const listener = vi.fn()
      const el1 = document.createElement('div')
      const el2 = document.createElement('div')
      const targetsRef: { current: HTMLElement[] } = { current: [el1, el2] }

      const { rerender } = await renderHook(() => useEventListener(targetsRef, ['mousedown', 'click'], listener))

      el1.dispatchEvent(new Event('mousedown'))
      el2.dispatchEvent(new Event('mousedown'))
      el1.dispatchEvent(new Event('click'))
      el2.dispatchEvent(new Event('click'))
      expect(listener).toHaveBeenCalledTimes(4)

      // disable
      targetsRef.current = []
      await rerender()
      el1.dispatchEvent(new Event('mousedown'))
      el2.dispatchEvent(new Event('mousedown'))
      el1.dispatchEvent(new Event('click'))
      el2.dispatchEvent(new Event('click'))
      // events should no longer trigger
      expect(listener).toHaveBeenCalledTimes(4)
    })

    it('should react to target + event + function changes properly', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const el1 = document.createElement('div')
      const el2 = document.createElement('div')
      const els = { current: [el1] as HTMLElement[] }

      const { rerender } = await renderHook(
        (props?: { events: string[], listeners: Array<() => void> }) =>
          useEventListener(els, props!.events, props!.listeners),
        { initialProps: { events: ['click'], listeners: [listener1] as Array<() => void> } },
      )
      el1.dispatchEvent(new Event('click'))
      els.current = [el2]
      await rerender({ events: ['click'], listeners: [listener1] })
      el1.dispatchEvent(new Event('click'))
      el2.dispatchEvent(new Event('click'))
      await rerender({ events: ['mousedown'], listeners: [listener1] })
      el1.dispatchEvent(new Event('click'))
      el2.dispatchEvent(new Event('click'))
      el2.dispatchEvent(new Event('mousedown'))
      els.current = [el1, el2]
      await rerender({ events: ['click', 'mousedown'], listeners: [listener1, listener2] })
      el1.dispatchEvent(new Event('click'))
      el2.dispatchEvent(new Event('click'))
      el1.dispatchEvent(new Event('mousedown'))
      el2.dispatchEvent(new Event('mousedown'))

      expect(listener1).toHaveBeenCalledTimes(7)
      expect(listener2).toHaveBeenCalledTimes(4)
    })

    it('should re-register when only the listeners change', async () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      const el = document.createElement('div')
      const targetRef = { current: el }

      const { rerender } = await renderHook(
        (props?: { listeners: Array<() => void> }) => useEventListener(targetRef, 'click', props!.listeners),
        { initialProps: { listeners: [listener1] as Array<() => void> } },
      )

      el.dispatchEvent(new Event('click'))
      expect(listener1).toHaveBeenCalledTimes(1)
      expect(listener2).not.toHaveBeenCalled()

      // a listener-count change must re-bind (upstream `watchImmediate` re-runs
      // on the raw listeners) — the target and event stay the same
      await rerender({ listeners: [listener1, listener2] })
      el.dispatchEvent(new Event('click'))

      expect(listener1).toHaveBeenCalledTimes(2)
      expect(listener2).toHaveBeenCalledTimes(1)
    })

    it('binds nothing when the target is a function', async () => {
      const listener = vi.fn()
      const el = document.createElement('div')
      const localAddSpy = vi.spyOn(el, 'addEventListener')

      await renderHook(() => {
        // getters are gone from the DOM-target contract: only a ref object is
        // accepted, which the compiler enforces here …
        // @ts-expect-error a function is not assignable to a ref object
        return useEventListener(() => el, 'mousedown', listener)
      })

      el.dispatchEvent(new Event('mousedown'))

      // … and at runtime the function resolves to no `current`, so nothing binds
      expect(localAddSpy).not.toHaveBeenCalled()
      expect(listener).not.toHaveBeenCalled()
    })

    it('re-binds when the ref is swapped via rerender', async () => {
      const listener = vi.fn()
      const el1 = document.createElement('div')
      const el2 = document.createElement('div')
      const targetRef: { current: HTMLDivElement | null } = { current: el1 }
      const add1 = vi.spyOn(el1, 'addEventListener')
      const remove1 = vi.spyOn(el1, 'removeEventListener')
      const add2 = vi.spyOn(el2, 'addEventListener')

      const { rerender } = await renderHook(() => useEventListener(targetRef, 'click', listener))

      el1.dispatchEvent(new Event('click'))
      expect(listener).toHaveBeenCalledTimes(1)
      expect(add1).toHaveBeenCalledTimes(1)

      // the ref moves to another element; the resolved target changes, so the
      // binding follows on the next render
      targetRef.current = el2
      await rerender()

      expect(remove1).toHaveBeenCalledTimes(1)
      expect(add2).toHaveBeenCalledTimes(1)

      el1.dispatchEvent(new Event('click'))
      expect(listener).toHaveBeenCalledTimes(1)

      el2.dispatchEvent(new Event('click'))
      expect(listener).toHaveBeenCalledTimes(2)
    })
  })

  it('should auto re-register', async () => {
    const targetRef = { current: undefined as HTMLDivElement | undefined }
    const listener = vi.fn()
    const { rerender } = await renderHook(
      (props?: { options: boolean | AddEventListenerOptions }) =>
        useEventListener(targetRef, 'click', listener, props!.options),
      { initialProps: { options: false as boolean | AddEventListenerOptions } },
    )

    const el = document.createElement('div')
    const addSpy = vi.spyOn(el, 'addEventListener')
    const removeSpy = vi.spyOn(el, 'removeEventListener')
    targetRef.current = el
    await rerender({ options: false })
    expect(addSpy).toHaveBeenCalledTimes(1)
    expect(addSpy).toHaveBeenLastCalledWith('click', expect.any(Function), false)
    expect(removeSpy).toHaveBeenCalledTimes(0)

    await rerender({ options: true })
    expect(addSpy).toHaveBeenCalledTimes(2)
    expect(addSpy).toHaveBeenLastCalledWith('click', expect.any(Function), true)
    expect(removeSpy).toHaveBeenCalledTimes(1)
  })

  it('should check document and shadowRoot', async () => {
    const element = document.createElement('div')
    const shadowRoot = element.attachShadow({ mode: 'open' })
    const listener1 = vi.fn()
    const listener2 = vi.fn()

    await renderHook(() => useEventListener({ current: shadowRoot }, 'click', listener1))
    await renderHook(() => useEventListener({ current: document }, 'click', listener2))

    shadowRoot.dispatchEvent(new Event('click'))
    document.dispatchEvent(new Event('click'))
    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledTimes(1)
  })

  it('should check multiple shadowRoots + multiple elements with multiple events', async () => {
    const element1 = document.createElement('div')
    const shadowRoot1 = element1.attachShadow({ mode: 'open' })
    const element2 = document.createElement('div')
    const shadowRoot2 = element2.attachShadow({ mode: 'closed' })

    const listener = vi.fn()
    const shadowListener = vi.fn()

    // heterogeneous target arrays are deliberately unsupported — two
    // same-typed hook calls replace the mixed element/shadow-root array
    await renderHook(() => useEventListener({ current: [element1, element2] }, ['click', 'slotchange'], listener))
    await renderHook(() => useEventListener({ current: [shadowRoot1, shadowRoot2] }, ['click', 'slotchange'], shadowListener))

    shadowRoot1.dispatchEvent(new Event('click'))
    shadowRoot2.dispatchEvent(new Event('click'))

    expect(shadowListener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenCalledTimes(0)

    element1.dispatchEvent(new Event('click'))
    element2.dispatchEvent(new Event('click'))

    expect(listener).toHaveBeenCalledTimes(2)
    expect(shadowListener).toHaveBeenCalledTimes(2)

    shadowRoot1.dispatchEvent(new Event('slotchange'))
    shadowRoot2.dispatchEvent(new Event('slotchange'))

    expect(shadowListener).toHaveBeenCalledTimes(4)
  })
})
