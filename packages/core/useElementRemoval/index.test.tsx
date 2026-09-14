import type { RefObject } from 'react'
import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useElementRemoval } from '../useElementRemoval'

/**
 * The hook binds DOM targets to React refs only — a plain element, a getter or
 * a callback ref is not accepted, so every test wraps its element in a
 * `{ current }` holder.
 */
function refOf<T>(value: T | null): RefObject<T | null> {
  return { current: value }
}

/**
 * MutationObserver delivers records asynchronously on a microtask; waiting on a
 * macrotask guarantees the delivery (the upstream test awaits `nextTick()`).
 */
async function flush(): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 0))
}

describe('useElementRemoval', () => {
  let callBackFn: Mock<(mutationRecords: MutationRecord[]) => void>
  let grandElement: HTMLElement
  let parentElement: HTMLElement
  let targetElement: HTMLElement

  beforeEach(() => {
    callBackFn = vi.fn((m: MutationRecord[]) => {
      expect(m[0]).toBeInstanceOf(MutationRecord)
    })
    grandElement = document.createElement('div')
    parentElement = document.createElement('div')
    targetElement = document.createElement('div')

    parentElement.appendChild(targetElement)
    grandElement.appendChild(parentElement)
    document.body.appendChild(grandElement)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should be defined', () => {
    expect(useElementRemoval).toBeDefined()
  })

  it('accepts only a React ref object as the DOM target', () => {
    expectTypeOf<Parameters<typeof useElementRemoval>[0]>()
      .toEqualTypeOf<RefObject<Element | null | undefined>>()
    // a plain element is deliberately rejected — refs are the only DOM target
    expectTypeOf<HTMLDivElement>()
      .not
      .toMatchTypeOf<Parameters<typeof useElementRemoval>[0]>()
  })

  it('should be called when the element is removed', async () => {
    await renderHook(() => useElementRemoval(refOf(targetElement), callBackFn))

    parentElement.removeChild(targetElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(1)

    parentElement.appendChild(targetElement)
    parentElement.removeChild(targetElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(2)

    parentElement.appendChild(targetElement)
    parentElement.innerHTML = ''
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(3)
  })

  it('should be called when any element containing the target element is removed', async () => {
    await renderHook(() => useElementRemoval(refOf(targetElement), callBackFn))

    grandElement.removeChild(parentElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(1)

    grandElement.appendChild(parentElement)
    grandElement.remove()
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(2)

    document.body.appendChild(grandElement)
    document.body.removeChild(grandElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(3)
  })

  it('should not be called when an unrelated element is removed', async () => {
    await renderHook(() => useElementRemoval(refOf(targetElement), callBackFn))

    const otherElement = document.createElement('div')
    grandElement.appendChild(otherElement)
    await flush()

    grandElement.removeChild(otherElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(0)

    // still observing: the removal of the target itself is still reported
    parentElement.removeChild(targetElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(1)
  })

  it('should correctly triggered when use the custom document', async () => {
    const shadowRoot = grandElement.attachShadow({ mode: 'open' })
    shadowRoot.appendChild(parentElement)

    await renderHook(() => useElementRemoval(refOf(targetElement), callBackFn, { document: shadowRoot }))

    parentElement.removeChild(targetElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(1)

    parentElement.appendChild(targetElement)
    parentElement.removeChild(targetElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(2)

    parentElement.appendChild(targetElement)
    parentElement.innerHTML = ''
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(3)
  })

  it('should correctly triggered even if the element is assigned a value after initialization', async () => {
    const el = document.createElement('div')
    const targetRef = refOf<HTMLElement>(null)

    const { rerender } = await renderHook(() => useElementRemoval(targetRef, callBackFn))

    // same object identity with `current` still null — nothing to watch yet
    parentElement.appendChild(el)
    await rerender()

    targetRef.current = el
    await rerender()

    parentElement.removeChild(el)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(1)
  })

  it('should stop observing after called the stop handle', async () => {
    const { result } = await renderHook(() => useElementRemoval(refOf(targetElement), callBackFn))

    result.current()

    parentElement.removeChild(targetElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(0)
  })

  it('should stop observing after unmount', async () => {
    const { unmount } = await renderHook(() => useElementRemoval(refOf(targetElement), callBackFn))

    await unmount()

    parentElement.removeChild(targetElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(0)
  })

  it('should not observe when window is not available', async () => {
    await renderHook(() =>
      useElementRemoval(refOf(targetElement), callBackFn, { window: null as unknown as Window }),
    )

    parentElement.removeChild(targetElement)
    await flush()
    expect(callBackFn).toHaveBeenCalledTimes(0)
  })
})
