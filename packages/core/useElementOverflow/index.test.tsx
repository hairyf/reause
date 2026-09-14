import type { RefObject } from 'react'
import type { UseElementOverflowReturn } from '../useElementOverflow'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useElementOverflow } from '../useElementOverflow'

/**
 * The hook binds DOM targets to React refs only — a plain element, a getter or
 * a callback ref is not accepted, so every test wraps its element in a
 * `{ current }` holder.
 */
function refOf<T>(value: T | null): RefObject<T | null> {
  return { current: value }
}

describe('useElementOverflow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should be defined', () => {
    expect(useElementOverflow).toBeDefined()
  })

  it('accepts only a React ref object as the DOM target', () => {
    expectTypeOf<Parameters<typeof useElementOverflow>[0]>()
      .toEqualTypeOf<RefObject<Element | null | undefined>>()
    // a plain element is deliberately rejected — refs are the only DOM target
    expectTypeOf<HTMLDivElement>()
      .not
      .toMatchTypeOf<Parameters<typeof useElementOverflow>[0]>()
  })

  it('should work when el is not an element', async () => {
    const { result } = await renderHook(() => useElementOverflow(refOf<Element>(null)))
    expect(result.current.isXOverflowed).toBe(false)
    expect(result.current.isYOverflowed).toBe(false)
  })

  it('should expose the overflow state as plain boolean state', async () => {
    // upstream returns `shallowReadonly` refs — React exposes plain booleans
    const { result } = await renderHook(() => useElementOverflow(refOf<Element>(null)))
    expect(result.current.isXOverflowed).toBeTypeOf('boolean')
    expect(result.current.isYOverflowed).toBeTypeOf('boolean')
  })

  it('should update overflow state when the container\'s size changes', async () => {
    // set container's size
    const el = document.createElement('div')
    document.body.appendChild(el)
    changeDomWidth(el, 'width', 100)
    changeDomWidth(el, 'offsetWidth', 100)
    changeDomWidth(el, 'scrollWidth', 100)
    // set content's size
    const content = document.createElement('div')
    changeDomWidth(content, 'width', 50)
    el.appendChild(content)

    const { result, act } = await renderHook(() => useElementOverflow(refOf(el)))

    expect(result.current.isXOverflowed).toBe(false)

    // update container's size
    changeDomWidth(el, 'width', 10)
    changeDomWidth(el, 'offsetWidth', 10)
    changeDomWidth(el, 'scrollWidth', 50)
    await act(() => result.current.update())
    expect(result.current.isXOverflowed).toBe(true)
    el.remove()
  })

  it('should update overflow state when content changed', async () => {
    // set container's size
    const el = document.createElement('div')
    document.body.appendChild(el)
    changeDomWidth(el, 'width', 100)
    changeDomWidth(el, 'offsetWidth', 100)
    changeDomWidth(el, 'scrollWidth', 100)
    const content = document.createElement('div')
    el.appendChild(content)

    const { result, act } = await renderHook(() =>
      useElementOverflow(refOf(el), { observeMutation: true }),
    )

    // update content's size
    changeDomWidth(content, 'width', 200)
    changeDomWidth(el, 'scrollWidth', 200)
    await act(() => result.current.update())
    expect(result.current.isXOverflowed).toBe(true)
    el.remove()
  })

  it('should update the vertical overflow state', async () => {
    const el = document.createElement('div')
    changeDomSize(el, 'offsetHeight', 10)
    changeDomSize(el, 'scrollHeight', 50)

    const { result, act } = await renderHook(() => useElementOverflow(refOf(el)))

    await act(() => result.current.update())
    expect(result.current.isYOverflowed).toBe(true)
  })

  it('should not update when window is not available', async () => {
    const el = document.createElement('div')
    changeDomSize(el, 'offsetWidth', 10)
    changeDomSize(el, 'scrollWidth', 50)

    const { result, act } = await renderHook(() =>
      useElementOverflow(refOf(el), { window: null as unknown as Window }),
    )

    await act(() => result.current.update())
    expect(result.current.isXOverflowed).toBe(false)
  })

  it('should ignore svg elements', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    const { result, act } = await renderHook(() => useElementOverflow(refOf(svg)))

    await act(() => result.current.update())
    expect(result.current.isXOverflowed).toBe(false)
    expect(result.current.isYOverflowed).toBe(false)
  })

  it('should update and call onUpdated from the resize observer', async () => {
    let resizeCallback: ResizeObserverCallback | undefined
    const onUpdated = vi.fn()
    const disconnect = vi.fn()
    const observe = vi.fn()

    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback
      }

      observe = observe
      unobserve = () => {}
      disconnect = disconnect
    })

    const el = document.createElement('div')
    document.body.appendChild(el)
    changeDomSize(el, 'offsetWidth', 10)
    changeDomSize(el, 'scrollWidth', 50)

    const { result, act, unmount } = await renderHook(() =>
      useElementOverflow(refOf(el), { onUpdated }),
    )

    await act(() => {
      resizeCallback?.([], {} as unknown as ResizeObserver)
    })

    expect(result.current.isXOverflowed).toBe(true)
    expect(onUpdated).toHaveBeenCalledOnce()

    await unmount()
    expect(disconnect).toHaveBeenCalled()
    el.remove()
  })

  it('should update and call onUpdated from the mutation observer', async () => {
    let mutationCallback: MutationCallback | undefined
    const onUpdated = vi.fn()
    const observed: MutationObserverInit[] = []

    // the hook wires the same `onUpdated` into the resize observer too, so a
    // real one adds its own initial delivery to the call count and races the
    // synchronous mutation callback below — stub it out to isolate the
    // mutation path
    vi.stubGlobal('ResizeObserver', class {
      constructor(_callback: ResizeObserverCallback) {}

      observe(): void {}

      unobserve(): void {}

      disconnect(): void {}
    })

    vi.stubGlobal('MutationObserver', class {
      constructor(callback: MutationCallback) {
        mutationCallback = callback
      }

      observe(_target: Node, options?: MutationObserverInit): void {
        observed.push(options ?? {})
      }

      disconnect(): void {}

      takeRecords(): MutationRecord[] {
        return []
      }
    })

    const el = document.createElement('div')
    document.body.appendChild(el)
    const content = document.createTextNode('fit')
    el.appendChild(content)
    changeDomSize(el, 'offsetWidth', 10)
    changeDomSize(el, 'scrollWidth', 50)

    const { result, act } = await renderHook(() =>
      useElementOverflow(refOf(el), { observeMutation: true, onUpdated }),
    )

    // wired with the default characterData/subtree options
    expect(observed).toEqual([{ childList: true, subtree: true, characterData: true }])

    // deliver the mutation synchronously instead of racing the real observer
    await act(() => {
      mutationCallback?.([], {} as unknown as MutationObserver)
    })

    expect(result.current.isXOverflowed).toBe(true)
    expect(onUpdated).toHaveBeenCalledOnce()
    el.remove()
  })

  it('should pass MutationObserverInit through when observeMutation is an object', async () => {
    const observed: MutationObserverInit[] = []

    vi.stubGlobal('MutationObserver', class {
      constructor(_callback: MutationCallback) {}

      observe(_target: Node, options?: MutationObserverInit): void {
        observed.push(options ?? {})
      }

      disconnect(): void {}

      takeRecords(): MutationRecord[] {
        return []
      }
    })

    const el = document.createElement('div')

    const { result } = await renderHook(() =>
      useElementOverflow(refOf(el), { observeMutation: { childList: true, subtree: true } }),
    )

    expect(result.current.isXOverflowed).toBe(false)
    expect(observed).toEqual([{ childList: true, subtree: true }])
    el.remove()
  })

  it('stop() disconnects the observers but update() keeps re-measuring', async () => {
    const el = document.createElement('div')
    changeDomSize(el, 'offsetWidth', 10)
    changeDomSize(el, 'scrollWidth', 50)

    const { result, act } = await renderHook(() => useElementOverflow(refOf(el)))

    // stop() only disconnects the observers — like upstream (no stop guard on
    // its public `update`), the manual update still re-measures after stop()
    result.current.stop()
    await act(() => result.current.update())
    expect(result.current.isXOverflowed).toBe(true)
  })

  it('stop() disconnects the observers', async () => {
    const disconnect = vi.fn()
    vi.stubGlobal('ResizeObserver', class {
      constructor(_callback: ResizeObserverCallback) {}

      observe(): void {}

      unobserve(): void {}

      disconnect = disconnect
    })

    const el = document.createElement('div')
    document.body.appendChild(el)
    const { result } = await renderHook(() => useElementOverflow(refOf(el)))

    expect(disconnect).not.toHaveBeenCalled()
    result.current.stop()
    expect(disconnect).toHaveBeenCalled()
    el.remove()
  })

  it('captures observeMutation once at mount and ignores later option changes', async () => {
    const observed: MutationObserverInit[] = []

    vi.stubGlobal('MutationObserver', class {
      constructor(_callback: MutationCallback) {}

      observe(_target: Node, options?: MutationObserverInit): void {
        observed.push(options ?? {})
      }

      disconnect(): void {}

      takeRecords(): MutationRecord[] {
        return []
      }
    })

    const el = document.createElement('div')

    const { rerender } = await renderHook<{ observeMutation: boolean | MutationObserverInit }, UseElementOverflowReturn>(
      (props = { observeMutation: false }) =>
        useElementOverflow(refOf(el), { observeMutation: props.observeMutation }),
      { initialProps: { observeMutation: { childList: true, subtree: true } } },
    )

    // attached once with the initial init
    expect(observed).toEqual([{ childList: true, subtree: true }])

    // upstream destructures observeMutation once at setup — a swapped init
    // object or a boolean flip after mount must not re-attach the observer
    await rerender({ observeMutation: { childList: true, characterData: true } })
    await rerender({ observeMutation: false })
    expect(observed).toEqual([{ childList: true, subtree: true }])
  })

  it('should start observing when a ref target attaches after mount', async () => {
    let resizeCallback: ResizeObserverCallback | undefined
    const observed: Element[] = []

    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback
      }

      observe(target: Element): void {
        observed.push(target)
      }

      unobserve(): void {}

      disconnect(): void {}
    })

    const el = document.createElement('div')
    document.body.appendChild(el)
    changeDomSize(el, 'offsetWidth', 10)
    changeDomSize(el, 'scrollWidth', 50)
    const ref = refOf<HTMLDivElement>(null)

    const { result, rerender, act } = await renderHook(
      (props?: { target: RefObject<HTMLDivElement | null> }) =>
        useElementOverflow(props?.target ?? ref),
      { initialProps: { target: ref } },
    )

    expect(result.current.isXOverflowed).toBe(false)
    expect(observed).toEqual([])

    ref.current = el
    await rerender({ target: ref })

    // the target that attached after mount is the one being observed
    expect(observed).toEqual([el])

    // deliver the observer callback synchronously instead of racing the real
    // resize observer
    await act(() => {
      resizeCallback?.([], {} as unknown as ResizeObserver)
    })
    expect(result.current.isXOverflowed).toBe(true)

    el.remove()
  })
})

function changeDomWidth(el: HTMLDivElement, property: 'width' | 'offsetWidth' | 'scrollWidth', value: number) {
  if (property === 'width') {
    el.style.width = `${value}px`
    return
  }
  Object.defineProperty(el, property, {
    value,
    writable: true,
  })
}

function changeDomSize(el: Element, property: 'offsetWidth' | 'scrollWidth' | 'offsetHeight' | 'scrollHeight', value: number) {
  Object.defineProperty(el, property, {
    value,
    writable: true,
  })
}
