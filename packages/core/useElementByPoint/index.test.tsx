import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook } from 'vitest-browser-react'
import { useElementByPoint } from '../useElementByPoint'
import UseElementByPointDemo from './demo'

function createElement(tag = 'div') {
  return document.createElement(tag)
}

describe('useElementByPoint', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('finds the element at the given point via elementFromPoint', async () => {
    const hit = createElement('section')
    const spy = vi.spyOn(document, 'elementFromPoint').mockReturnValue(hit)

    const { result } = await renderHook(() => useElementByPoint({ x: 10, y: 20 }))

    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalledWith(10, 20)
      expect(result.current.element).toBe(hit)
    })
  })

  it('keeps element null when the point hits nothing', async () => {
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(null)

    const { result } = await renderHook(() => useElementByPoint({ x: 0, y: 0 }))

    await vi.waitFor(() => {
      expect(document.elementFromPoint).toHaveBeenCalled()
      expect(result.current.element).toBe(null)
    })
  })

  it('updates the element when x / y change', async () => {
    const first = createElement('div')
    const second = createElement('p')
    const spy = vi.spyOn(document, 'elementFromPoint').mockReturnValue(first)

    const { result, rerender } = await renderHook(
      (props: { x: number, y: number } = { x: 0, y: 0 }) => useElementByPoint(props),
      { initialProps: { x: 0, y: 0 } },
    )

    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalledWith(0, 0)
      expect(result.current.element).toBe(first)
    })

    spy.mockReturnValue(second)
    await rerender({ x: 50, y: 60 })

    await vi.waitFor(() => {
      expect(result.current.element).toBe(second)
    })
    expect(spy).toHaveBeenCalledWith(50, 60)
  })

  it('resolves x / y every tick', async () => {
    const first = createElement('div')
    const second = createElement('span')
    const spy = vi.spyOn(document, 'elementFromPoint').mockReturnValue(first)

    const { result, rerender } = await renderHook(
      (props: { x: number, y: number } = { x: 0, y: 0 }) => useElementByPoint(props),
      { initialProps: { x: 0, y: 0 } },
    )

    await vi.waitFor(() => expect(result.current.element).toBe(first))

    spy.mockReturnValue(second)
    await rerender({ x: 30, y: 40 })

    await vi.waitFor(() => expect(result.current.element).toBe(second))
    expect(spy).toHaveBeenCalledWith(30, 40)
  })

  it('returns every element under the point when multiple is true', async () => {
    const stack = [createElement('div'), createElement('p'), createElement('span')]
    const spy = vi.spyOn(document, 'elementsFromPoint').mockReturnValue(stack)

    const { result } = await renderHook(() => useElementByPoint({ x: 5, y: 5, multiple: true }))

    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalledWith(5, 5)
      expect(result.current.element).toEqual(stack)
    })
  })

  it('returns an empty array when multiple is true and nothing is under the point', async () => {
    const spy = vi.spyOn(document, 'elementsFromPoint').mockReturnValue([])

    const { result } = await renderHook(() => useElementByPoint({ x: 1, y: 1, multiple: true }))

    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalled()
      expect(result.current.element).toEqual([])
    })
  })

  it('switches to elementsFromPoint when multiple flips from false to true', async () => {
    const stack = [createElement('article')]
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(createElement('div'))
    const multipleSpy = vi.spyOn(document, 'elementsFromPoint').mockReturnValue(stack)

    const { result, rerender } = await renderHook(
      (props: { multiple: boolean } = { multiple: false }) => useElementByPoint({ x: 2, y: 2, multiple: props.multiple }),
      { initialProps: { multiple: false } },
    )

    await vi.waitFor(() => {
      expect(document.elementFromPoint).toHaveBeenCalled()
      expect(result.current.element).not.toBe(null)
    })

    await rerender({ multiple: true })

    await vi.waitFor(() => {
      expect(multipleSpy).toHaveBeenCalledWith(2, 2)
      expect(result.current.element).toEqual(stack)
    })
  })

  it('re-probes isSupported when multiple flips on a document with partial support', async () => {
    // `elementFromPoint` exists but `elementsFromPoint` does not
    const partialDocument = {
      elementFromPoint: () => null,
    } as unknown as Document

    const { result, rerender, act } = await renderHook(
      (props: { multiple: boolean } = { multiple: false }) => useElementByPoint({ x: 0, y: 0, document: partialDocument, multiple: props.multiple }),
      { initialProps: { multiple: false } },
    )

    await vi.waitFor(() => expect(result.current.isSupported).toBe(true))

    // While `multiple` is on, every scheduler tick publishes a fresh (empty)
    // element stack, which keeps re-rendering and starves act() on WebKit —
    // stop the loop first: the support probe is independent of the scheduler
    await act(() => result.current.pause())

    await rerender({ multiple: true })
    await vi.waitFor(() => expect(result.current.isSupported).toBe(false))
  })

  it('uses a custom document option', async () => {
    const customDocument = document.implementation.createHTMLDocument('useElementByPoint-test')
    const hit = customDocument.createElement('article')
    const spy = vi.spyOn(customDocument, 'elementFromPoint').mockReturnValue(hit)

    const { result } = await renderHook(() => useElementByPoint({ x: 3, y: 4, document: customDocument }))

    await vi.waitFor(() => {
      expect(spy).toHaveBeenCalledWith(3, 4)
      expect(result.current.element).toBe(hit)
    })
  })

  it('reports isSupported when elementFromPoint is available', async () => {
    const { result } = await renderHook(() => useElementByPoint({ x: 0, y: 0 }))

    await vi.waitFor(() => expect(result.current.isSupported).toBe(true))
  })

  it('reports isSupported false and no element on a document without elementFromPoint', async () => {
    const unsupportedDocument = {} as unknown as Document
    const { result } = await renderHook(() => useElementByPoint({ x: 0, y: 0, document: unsupportedDocument }))

    await vi.waitFor(() => expect(result.current.isSupported).toBe(false))
    await vi.waitFor(() => expect(result.current.element).toBe(null))
  })

  it('reports isSupported false and an empty stack in multiple mode on a document without elementsFromPoint', async () => {
    const unsupportedDocument = {} as unknown as Document
    const { result } = await renderHook(() => useElementByPoint({ x: 0, y: 0, multiple: true, document: unsupportedDocument }))

    await vi.waitFor(() => expect(result.current.isSupported).toBe(false))
    await vi.waitFor(() => expect(result.current.element).toEqual([]))
  })

  it('supports a custom scheduler driving the element updates', async () => {
    const hit = createElement('div')
    const spy = vi.spyOn(document, 'elementFromPoint').mockReturnValue(hit)

    let scheduled: (() => void) | undefined
    const scheduler = vi.fn((cb: () => void) => {
      scheduled = cb
      return { isActive: true, pause: vi.fn(), resume: vi.fn() }
    })

    const { result, act } = await renderHook(() => useElementByPoint({ x: 7, y: 8, scheduler }))

    // the loop is composed through the custom scheduler, not useRafFn
    expect(scheduler).toHaveBeenCalled()
    expect(result.current.isActive).toBe(true)
    expect(typeof result.current.pause).toBe('function')
    expect(typeof result.current.resume).toBe('function')

    // the custom scheduler drives the hit-test
    await act(() => scheduled?.())
    expect(spy).toHaveBeenCalledWith(7, 8)
    expect(result.current.element).toBe(hit)
  })

  it('exposes pausable controls', async () => {
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(createElement('div'))

    const { result, act } = await renderHook(() => useElementByPoint({ x: 1, y: 2 }))

    await vi.waitFor(() => expect(result.current.isActive).toBe(true))

    await act(() => result.current.pause())
    expect(result.current.isActive).toBe(false)

    await act(() => result.current.resume())
    expect(result.current.isActive).toBe(true)
  })

  it('renders safe defaults during the first render (SSR safety)', async () => {
    let firstRender: ReturnType<typeof useElementByPoint> | undefined

    function Probe() {
      const state = useElementByPoint({ x: 10, y: 10 })
      firstRender ??= state
      return <div>{String(state.element === null)}</div>
    }

    await render(<Probe />)

    // the first render must not touch the DOM: no element hit-test yet, the
    // support flag is unresolved and the rAF loop is not active yet
    expect(firstRender?.element).toBe(null)
    expect(firstRender?.isSupported).toBe(false)
    expect(firstRender?.isActive).toBe(false)
    expect(typeof firstRender?.pause).toBe('function')
    expect(typeof firstRender?.resume).toBe('function')
  })

  it('renders the demo', async () => {
    const screen = await render(<UseElementByPointDemo />)

    await expect.element(screen.baseElement).toBeInTheDocument()
  })
})
