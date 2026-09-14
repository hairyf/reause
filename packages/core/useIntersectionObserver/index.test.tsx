import type { RefObject } from 'react'
import type { UseIntersectionObserverOptions } from '../useIntersectionObserver'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useIntersectionObserver } from '../useIntersectionObserver'

/**
 * The hook binds DOM targets to React refs only — a plain element, a getter or
 * a callback ref is not accepted, so every test wraps its element in a
 * `{ current }` holder.
 */
function refOf<T>(value: T | null): RefObject<T | null> {
  return { current: value }
}

describe('useIntersectionObserver', () => {
  beforeEach(() => {
    window.scrollTo(0, 0)
  })

  it('accepts an array of element refs as target', () => {
    expectTypeOf<RefObject<HTMLElement | null>[]>()
      .toExtend<Parameters<typeof useIntersectionObserver>[0]>()
    // a plain element is deliberately rejected — refs are the only DOM target
    expectTypeOf<HTMLDivElement>()
      .not
      .toMatchTypeOf<Parameters<typeof useIntersectionObserver>[0]>()
    // the callback form of React's `Ref<T>` is rejected too
    expectTypeOf<(instance: HTMLElement | null) => void>()
      .not
      .toMatchTypeOf<Parameters<typeof useIntersectionObserver>[0]>()
    // `rootMargin` is a plain CSS margin string, not a ref/value union
    expectTypeOf<UseIntersectionObserverOptions['rootMargin']>()
      .toEqualTypeOf<string | undefined>()
  })

  const expectFunctionHasNotBeenCalled = async (callbackMock: any) => {
    await expect(
      vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalled()
      }, { timeout: 100 }),
    ).rejects.toThrow()
  }

  describe('observe the intersection of the target and the root', () => {
    it('root is viewport by default', async () => {
      const callbackMock = vi.fn()

      const spacer = document.createElement('div')
      spacer.style.height = 'calc(100vh + 10px)'
      const target = document.createElement('div')
      target.style.height = '100px'
      target.textContent = 'Target Node'
      document.body.append(spacer, target)

      const { unmount } = await renderHook(() =>
        useIntersectionObserver({ current: target }, callbackMock),
      )

      // immediate call
      await vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalledTimes(1)
        expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(false)
      })

      window.scrollTo(0, 100)

      await vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalledTimes(2)
        expect(callbackMock.mock.calls[1][0][0].isIntersecting).toBe(true)
      })

      await unmount()
      spacer.remove()
      target.remove()
    })

    it('can specify different root', async () => {
      const callbackMock = vi.fn()

      const root = document.createElement('div')
      root.id = 'root-node'
      root.style.height = '200px'
      root.style.overflow = 'scroll'
      const target = document.createElement('div')
      target.style.height = '100px'
      target.textContent = 'Target Node'
      const innerSpacer = document.createElement('div')
      innerSpacer.style.height = '400px'
      root.append(target, innerSpacer)
      const outerSpacer = document.createElement('div')
      outerSpacer.style.height = 'calc(100vh + 10px)'
      document.body.append(root, outerSpacer)

      const { unmount } = await renderHook(() =>
        useIntersectionObserver(
          { current: target },
          callbackMock,
          { root: { current: root } }, // specify the root
        ),
      )

      // immediate call
      await vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalledTimes(1)
        expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(true)
        // rootBounds.height == 200px shows that it is the specified root-node
        expect(callbackMock.mock.calls[0][0][0].rootBounds!.height).toBe(200)
      })

      callbackMock.mockClear()

      // scroll window should not trigger the observer
      window.scrollTo(0, 200)
      await expectFunctionHasNotBeenCalled(callbackMock)

      root.scrollTo(0, 200)
      await vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalledTimes(1)
        expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(false)
        expect(callbackMock.mock.calls[0][0][0].rootBounds!.height).toBe(200)
      })

      root.scrollTo(0, 0)
      await vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalledTimes(2)
        expect(callbackMock.mock.calls[1][0][0].isIntersecting).toBe(true)
        expect(callbackMock.mock.calls[1][0][0].rootBounds!.height).toBe(200)
      })

      await unmount()
      root.remove()
      outerSpacer.remove()
    })

    it('rootMargin can extend the root as intersection region', async () => {
      const callbackMock = vi.fn()

      const root = document.createElement('div')
      root.id = 'root-node'
      root.style.height = '200px'
      root.style.overflow = 'scroll'
      const spacer = document.createElement('div')
      spacer.style.height = '210px'
      const target = document.createElement('div')
      target.style.height = '100px'
      target.textContent = 'Target Node'
      root.append(spacer, target)
      document.body.append(root)

      const { unmount } = await renderHook(() =>
        useIntersectionObserver(
          { current: target },
          callbackMock,
          {
            root: { current: root },
            rootMargin: '10px',
          },
        ),
      )

      // The target is 10px below the rootNode, but the rootMargin is 10px, so it should be intersecting
      await vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalledTimes(1)
        expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(true)
      })

      await unmount()
      root.remove()
    })

    it('threshold controls at what visibility percentage the intersection callback is fired', async () => {
      const callbackMock = vi.fn()

      const topSpacer = document.createElement('div')
      topSpacer.style.height = 'calc(100vh + 10px)'
      const target = document.createElement('div')
      target.style.height = '100px'
      target.textContent = 'Target Node'
      const bottomSpacer = document.createElement('div')
      bottomSpacer.style.height = '500px'
      document.body.append(topSpacer, target, bottomSpacer)

      const { unmount } = await renderHook(() =>
        useIntersectionObserver(
          { current: target },
          callbackMock,
          { threshold: [0, 0.5, 1] },
        ),
      )

      await vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalledTimes(1)
        expect(callbackMock.mock.calls[0][0][0].intersectionRatio).toBe(0)
        expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(false)
      })
      callbackMock.mockClear()

      // scroll 10px down to "touch" the target
      window.scrollTo(0, 10)
      await vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalledTimes(1)
        expect(callbackMock.mock.calls[0][0][0].intersectionRatio).toBe(0)
        expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(true)
      })
      callbackMock.mockClear()

      // scroll to show 50% of the target
      window.scrollTo(0, 60)
      await vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalledTimes(1)
        expect(callbackMock.mock.calls[0][0][0].intersectionRatio).toBeCloseTo(0.5)
        expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(true)
      })
      callbackMock.mockClear()

      // scroll far beyond the target
      window.scrollTo(0, 200)
      await vi.waitFor(() => {
        expect(callbackMock).toHaveBeenCalledTimes(1)
        expect(callbackMock.mock.calls[0][0][0].intersectionRatio).toBe(1)
        expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(true)
      })

      await unmount()
      topSpacer.remove()
      target.remove()
      bottomSpacer.remove()
    })
  })

  it('target is reactive', async () => {
    const callbackMock = vi.fn()
    const target = refOf<HTMLDivElement>(null)

    const spacer = document.createElement('div')
    spacer.style.height = 'calc(100vh + 10px)'
    const targetNode1 = document.createElement('div')
    targetNode1.style.height = '100px'
    targetNode1.textContent = 'Target Node 1'
    const targetNode2 = document.createElement('div')
    targetNode2.style.height = '100px'
    targetNode2.textContent = 'Target Node 2'
    document.body.append(spacer, targetNode1, targetNode2)

    const { rerender, unmount } = await renderHook(
      (props?: { target: RefObject<HTMLDivElement | null> }) =>
        useIntersectionObserver(props?.target ?? { current: null }, callbackMock),
      { initialProps: { target } },
    )

    target.current = targetNode1
    await rerender({ target })

    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1)
      expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(false)
      expect(callbackMock.mock.calls[0][0][0].target.textContent).toBe('Target Node 1')
    })

    window.scrollTo(0, 200)

    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(2)
      expect(callbackMock.mock.calls[1][0][0].isIntersecting).toBe(true)
      expect(callbackMock.mock.calls[1][0][0].target.textContent).toBe('Target Node 1')
    })

    callbackMock.mockClear()

    target.current = targetNode2
    await rerender({ target })

    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1)
      expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(true)
      expect(callbackMock.mock.calls[0][0][0].target.textContent).toBe('Target Node 2')
    })

    window.scrollTo(0, 0)

    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(2)
      expect(callbackMock.mock.calls[1][0][0].isIntersecting).toBe(false)
      expect(callbackMock.mock.calls[1][0][0].target.textContent).toBe('Target Node 2')
    })

    await unmount()
    spacer.remove()
    targetNode1.remove()
    targetNode2.remove()
  })

  it('root is reactive', async () => {
    const callbackMock = vi.fn()
    const rootRef = refOf<HTMLDivElement>(null)

    const spacer = document.createElement('div')
    spacer.style.height = 'calc(100vh + 10px)'
    const rootNode = document.createElement('div')
    rootNode.style.height = '200px'
    rootNode.style.overflow = 'scroll'
    rootNode.style.border = '1px solid red'
    const target = document.createElement('div')
    target.style.height = '100px'
    target.textContent = 'Target Node'
    const innerSpacer = document.createElement('div')
    innerSpacer.style.height = '400px'
    rootNode.append(target, innerSpacer)
    document.body.append(spacer, rootNode)

    const { rerender, unmount } = await renderHook(
      (props?: { root: RefObject<HTMLDivElement | null> }) =>
        useIntersectionObserver(
          { current: target },
          callbackMock,
          { root: props?.root ?? { current: null } },
        ),
      { initialProps: { root: rootRef } },
    )

    // root is viewport by default
    // immediate call
    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1)
      expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(false)
    })

    // scroll viewport and show the targetNode
    window.scrollTo(0, 100)

    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(2)
      expect(callbackMock.mock.calls[1][0][0].isIntersecting).toBe(true)
    })

    callbackMock.mockClear()

    // change root to the rootNode, which updates the observer
    rootRef.current = rootNode
    await rerender({ root: rootRef })

    // immediate call after the root change
    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1)
      expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(true)
      // verify if the root changes to the 200px height rootNode
      expect(callbackMock.mock.calls[0][0][0].rootBounds!.height).toBe(200)
    })
    callbackMock.mockClear()

    // viewport's intersection isn't observed any more
    window.scrollTo(0, 0)
    await expectFunctionHasNotBeenCalled(callbackMock)

    rootNode.scrollTo(0, 300)
    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1)
      expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(false)
      // verify if the root changes to the 200px height rootNode
      expect(callbackMock.mock.calls[0][0][0].rootBounds!.height).toBe(200)
    })

    await unmount()
    spacer.remove()
    rootNode.remove()
  })

  it('the observer will not start in the beginning if immediate: false', async () => {
    const callbackMock = vi.fn()

    const spacer = document.createElement('div')
    spacer.style.height = 'calc(100vh + 10px)'
    const target = document.createElement('div')
    target.style.height = '100px'
    target.textContent = 'Target Node'
    document.body.append(spacer, target)

    const { result, act, unmount } = await renderHook(() =>
      useIntersectionObserver(
        { current: target },
        callbackMock,
        { immediate: false },
      ),
    )

    expect(result.current.isActive).toBe(false)
    await expectFunctionHasNotBeenCalled(callbackMock)

    window.scrollTo(0, 100)
    await expectFunctionHasNotBeenCalled(callbackMock)

    // resume starts observing without re-rendering the component
    await act(() => {
      result.current.resume()
    })
    expect(result.current.isActive).toBe(true)

    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1)
      expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(true)
    })

    await unmount()
    spacer.remove()
    target.remove()
  })

  it('pause stops observing and resume restarts it', async () => {
    const callbackMock = vi.fn()

    const spacer = document.createElement('div')
    spacer.style.height = 'calc(100vh + 10px)'
    const target = document.createElement('div')
    target.style.height = '100px'
    target.textContent = 'Target Node'
    document.body.append(spacer, target)

    const { result, act, unmount } = await renderHook(() =>
      useIntersectionObserver({ current: target }, callbackMock),
    )

    // immediate call
    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1)
      expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(false)
    })
    expect(result.current.isActive).toBe(true)

    callbackMock.mockClear()
    await act(() => {
      result.current.pause()
    })
    expect(result.current.isActive).toBe(false)

    // scroll should not trigger the callback while paused
    window.scrollTo(0, 100)
    await expectFunctionHasNotBeenCalled(callbackMock)

    await act(() => {
      result.current.resume()
    })
    expect(result.current.isActive).toBe(true)

    // resume re-observes and delivers the current intersection state
    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1)
      expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(true)
    })

    await unmount()
    spacer.remove()
    target.remove()
  })

  it('isSupported is always true when in the browser mode', async () => {
    const target = document.createElement('div')
    target.textContent = 'Target Node'
    document.body.append(target)

    const { result, unmount } = await renderHook(() =>
      useIntersectionObserver({ current: target }, () => {}),
    )
    expect(result.current.isSupported).toBe(true)

    await unmount()
    target.remove()
  })

  it('stop observing when calling stop, not be able to observe again', async () => {
    const callbackMock = vi.fn()

    const spacer = document.createElement('div')
    spacer.style.height = 'calc(100vh + 10px)'
    const target = document.createElement('div')
    target.style.height = '100px'
    target.textContent = 'Target Node'
    document.body.append(spacer, target)

    const { result, act, unmount } = await renderHook(() =>
      useIntersectionObserver({ current: target }, callbackMock),
    )

    // immediate call
    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1)
      expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(false)
    })

    // scroll to intersect
    window.scrollTo(0, 100)
    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(2)
      expect(callbackMock.mock.calls[1][0][0].isIntersecting).toBe(true)
    })
    callbackMock.mockClear()

    await act(() => {
      result.current.stop()
    })
    expect(result.current.isActive).toBe(false)

    // scroll back, should not trigger callback
    window.scrollTo(0, 0)
    await expectFunctionHasNotBeenCalled(callbackMock)

    // scroll again, should not trigger callback
    window.scrollTo(0, 100)
    await expectFunctionHasNotBeenCalled(callbackMock)

    await unmount()
    spacer.remove()
    target.remove()
  })

  it('observer will stop when unmounted', async () => {
    const callbackMock = vi.fn()

    const spacer = document.createElement('div')
    spacer.style.height = 'calc(100vh + 10px)'
    const target = document.createElement('div')
    target.textContent = 'Target Node'
    document.body.append(spacer, target)

    const { unmount } = await renderHook(() =>
      useIntersectionObserver({ current: target }, callbackMock),
    )

    // immediate call
    await vi.waitFor(() => {
      expect(callbackMock).toHaveBeenCalledTimes(1)
      expect(callbackMock.mock.calls[0][0][0].isIntersecting).toBe(false)
    })

    callbackMock.mockClear()
    await unmount()

    // scroll should not trigger callback after unmount
    window.scrollTo(0, 100)
    await expectFunctionHasNotBeenCalled(callbackMock)

    spacer.remove()
    target.remove()
  })
})
