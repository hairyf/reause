import type { RefObject } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useMutationObserver } from '../useMutationObserver'

/**
 * The hook binds DOM targets to React refs only — a plain element, a getter or
 * a callback ref is not accepted, so every test wraps its element in a
 * `{ current }` holder.
 */
function refOf<T>(value: T | null): RefObject<T | null> {
  return { current: value }
}

/**
 * MutationObserver delivers records asynchronously on a microtask; waiting on
 * a macrotask guarantees the queue was drained first.
 */
async function flush(): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 0))
}

describe('useMutationObserver', () => {
  it('should be defined', () => {
    expect(useMutationObserver).toBeDefined()
  })

  it('accepts an array of element refs as target', () => {
    expectTypeOf<RefObject<HTMLElement | null>[]>()
      .toExtend<Parameters<typeof useMutationObserver>[0]>()
    // a plain element is deliberately rejected — refs are the only DOM target
    expectTypeOf<HTMLDivElement>()
      .not
      .toMatchTypeOf<Parameters<typeof useMutationObserver>[0]>()
    // the callback form of React's `Ref<T>` is rejected too
    expectTypeOf<(instance: HTMLElement | null) => void>()
      .not
      .toMatchTypeOf<Parameters<typeof useMutationObserver>[0]>()
  })

  it('should work with attributes', async () => {
    const cb = vi.fn()

    const target = document.createElement('div')
    target.setAttribute('id', 'header')

    const { unmount } = await renderHook(() => useMutationObserver(refOf(target), cb, {
      attributes: true,
    }))

    target.setAttribute('id', 'footer')
    await flush()
    expect(cb).toHaveBeenCalledTimes(1)

    target.setAttribute('id', 'header')
    await flush()
    expect(cb).toHaveBeenCalledTimes(2)
    const record = cb.mock.calls[0][0][0]
    expect(record).toBeInstanceOf(MutationRecord)
    expect(record.target).toBe(target)

    await unmount()
  })

  it('should work with childList', async () => {
    const target = document.createElement('div')

    const cb = vi.fn()

    const { unmount } = await renderHook(() => useMutationObserver(refOf(target), cb, {
      childList: true,
    }))

    target.appendChild(document.createElement('div'))
    await flush()
    expect(cb).toHaveBeenCalled()

    await unmount()
  })

  it('should work with subtree', async () => {
    const target = document.createElement('div')
    const cb = vi.fn()

    const { unmount } = await renderHook(() => useMutationObserver(refOf(target), cb, {
      subtree: true,
      childList: true,
    }))

    const child = document.createElement('div')

    target.appendChild(child)
    await flush()
    expect(cb).toHaveBeenCalled()

    child.appendChild(document.createElement('div'))
    await flush()
    expect(cb).toHaveBeenCalledTimes(2)

    await unmount()
  })

  it('should work with characterData', async () => {
    const target = document.createTextNode('123')
    const cb = vi.fn()
    const { unmount } = await renderHook(() =>
      // @ts-expect-error — upstream accepts Text nodes even though the type says TargetElement
      useMutationObserver(refOf(target), cb, {
        characterData: true,
      }),
    )
    target.data = 'content'

    await flush()
    expect(cb).toHaveBeenCalled()

    target.data = 'footer'
    await flush()
    expect(cb).toHaveBeenCalledTimes(2)

    await unmount()
  })

  it('should work with attributeFilter', async () => {
    const target = document.createElement('div')
    const cb = vi.fn()

    const { unmount } = await renderHook(() => useMutationObserver(refOf(target), cb, {
      attributes: true,
      attributeFilter: ['id'],
    }))

    target.setAttribute('id', 'footer')
    await flush()
    expect(cb).toHaveBeenCalled()

    target.setAttribute('class', 'footer')
    await flush()
    expect(cb).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('should work with attributeOldValue', async () => {
    const target = document.createElement('div')
    const cb = vi.fn()

    const { unmount } = await renderHook(() => useMutationObserver(refOf(target), cb, {
      attributes: true,
      attributeOldValue: true,
    }))

    target.setAttribute('id', 'footer')
    await flush()
    expect(cb).toHaveBeenCalled()

    const record = cb.mock.calls[0][0][0]
    expect(record.oldValue).toBe(null)

    target.setAttribute('id', 'header')
    await flush()
    expect(cb).toHaveBeenCalledTimes(2)

    const record2 = cb.mock.calls[1][0][0]
    expect(record2.oldValue).toBe('footer')

    await unmount()
  })

  it('should work with characterDataOldValue', async () => {
    const target = document.createTextNode('123')
    const cb = vi.fn()
    const { unmount } = await renderHook(() =>
      // @ts-expect-error — upstream accepts Text nodes even though the type says TargetElement
      useMutationObserver(refOf(target), cb, {
        characterData: true,
        characterDataOldValue: true,
      }),
    )

    target.data = 'content'
    await flush()
    expect(cb).toHaveBeenCalled()

    const record = cb.mock.calls[0][0][0]
    expect(record.oldValue).toBe('123')

    target.data = 'footer'
    await flush()
    expect(cb).toHaveBeenCalledTimes(2)

    const record2 = cb.mock.calls[1][0][0]
    expect(record2.oldValue).toBe('content')

    await unmount()
  })

  it('should work with stop', async () => {
    const target = document.createElement('div')
    const cb = vi.fn()

    const { result, unmount } = await renderHook(() => useMutationObserver(refOf(target), cb, {
      attributes: true,
    }))

    target.setAttribute('id', 'footer')
    await flush()
    expect(cb).toHaveBeenCalled()

    result.current.stop()
    target.setAttribute('id', 'header')
    await flush()
    expect(cb).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('should work with takeRecords', async () => {
    const target = document.createElement('div')
    const cb = vi.fn()

    const { result, unmount } = await renderHook(() => useMutationObserver(refOf(target), cb, {
      attributes: true,
    }))

    target.setAttribute('id', 'footer')
    await flush()
    expect(cb).toHaveBeenCalledTimes(1)

    target.setAttribute('id', 'header')
    const records = result.current.takeRecords()

    await flush()
    expect(records).toHaveLength(1)
    expect(records![0].target).toBe(target)
    expect(cb).toHaveBeenCalledTimes(1)

    await unmount()
  })

  it('should work with multiple targets', async () => {
    const headerElement = refOf<HTMLDivElement>(document.createElement('div'))
    const footerElement = refOf<HTMLDivElement>(document.createElement('div'))
    const targetRefs = [headerElement, footerElement]
    const cb = vi.fn()

    const { rerender, result, unmount } = await renderHook(
      (props?: { target: Parameters<typeof useMutationObserver>[0] }) =>
        useMutationObserver(props?.target ?? [], cb, {
          attributes: true,
        }),
      { initialProps: { target: targetRefs } },
    )

    headerElement.current?.setAttribute('id', 'header')
    footerElement.current?.setAttribute('id', 'footer')
    let records = result.current.takeRecords()
    await flush()
    expect(records).toHaveLength(2)
    expect(records![0].target).toBe(headerElement.current)
    expect(records![1].target).toBe(footerElement.current)

    headerElement.current = null
    footerElement.current?.removeAttribute('id')
    records = result.current.takeRecords()
    await rerender({ target: targetRefs })
    await flush()
    expect(records).toHaveLength(1)
    expect(records![0].target).toBe(footerElement.current)

    await unmount()
  })

  it('should return undefined from takeRecords without a target', async () => {
    const cb = vi.fn()

    const { result, unmount } = await renderHook(() => useMutationObserver([], cb, {
      attributes: true,
    }))

    await flush()
    expect(result.current.takeRecords()).toBeUndefined()

    await unmount()
  })

  it('should not build an observer while the target ref is empty', async () => {
    const element = refOf<HTMLDivElement>(null)
    const cb = vi.fn()

    const { rerender, result, unmount } = await renderHook(
      (props?: { target: RefObject<HTMLDivElement | null> }) =>
        useMutationObserver(props?.target ?? element, cb, {
          attributes: true,
        }),
      { initialProps: { target: element } },
    )

    await flush()
    expect(result.current.takeRecords()).toBeUndefined()

    element.current = document.createElement('div')
    await rerender({ target: element })
    await flush()
    expect(result.current.takeRecords()).toEqual([])

    await unmount()
  })

  it('should pin the callback at observer construction', async () => {
    const target = document.createElement('div')
    const first = vi.fn()
    const second = vi.fn()

    const { rerender, unmount } = await renderHook(
      (props?: { callback: Parameters<typeof useMutationObserver>[1] }) =>
        useMutationObserver(refOf(target), props?.callback ?? first, {
          attributes: true,
        }),
      { initialProps: { callback: first } },
    )

    target.setAttribute('id', 'first')
    await flush()
    expect(first).toHaveBeenCalledTimes(1)

    await rerender({ callback: second })
    target.setAttribute('id', 'second')
    await flush()
    // upstream parity: a new callback alone does not rebuild the observer
    expect(first).toHaveBeenCalledTimes(2)
    expect(second).not.toHaveBeenCalled()

    await unmount()
  })
})
