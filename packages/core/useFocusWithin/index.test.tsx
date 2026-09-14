import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useFocusWithin } from '../useFocusWithin'

describe('useFocusWithin', () => {
  let parent: HTMLFormElement
  let child: HTMLDivElement
  let child2: HTMLDivElement
  let grandchild: HTMLInputElement

  beforeEach(() => {
    parent = document.createElement('form')
    parent.tabIndex = 0
    document.body.appendChild(parent)

    child = document.createElement('div')
    child.tabIndex = 0
    parent.appendChild(child)

    child2 = document.createElement('div')
    child2.tabIndex = 0
    parent.appendChild(child2)

    grandchild = document.createElement('input')
    grandchild.tabIndex = 0
    child.appendChild(grandchild)
  })

  afterEach(() => {
    parent.remove()
  })

  it('should be defined', () => {
    expect(useFocusWithin).toBeDefined()
  })

  it('should initialize properly', async () => {
    const { result } = await renderHook(() => useFocusWithin({ current: parent }))

    expect(result.current.focused).toBeFalsy()
  })

  it('should track the state of the target itself', async () => {
    const { result, act } = await renderHook(() => useFocusWithin({ current: parent }))

    expect(result.current.focused).toBeFalsy()

    await act(() => {
      parent.focus()
    })
    expect(result.current.focused).toBeTruthy()

    await act(() => {
      parent.blur()
    })
    expect(result.current.focused).toBeFalsy()
  })

  it('should track the state of the targets descendants', async () => {
    const { result, act } = await renderHook(() => useFocusWithin({ current: parent }))

    expect(result.current.focused).toBeFalsy()

    await act(() => {
      child.focus()
    })
    expect(result.current.focused).toBeTruthy()

    await act(() => {
      child.blur()
    })
    expect(result.current.focused).toBeFalsy()

    await act(() => {
      grandchild.focus()
    })
    expect(result.current.focused).toBeTruthy()

    await act(() => {
      grandchild.blur()
    })
    expect(result.current.focused).toBeFalsy()
  })

  it('should track the state while the descendants switch focus state', async () => {
    const { result, act } = await renderHook(() => useFocusWithin({ current: parent }))

    expect(result.current.focused).toBeFalsy()

    await act(() => {
      child.focus()
    })
    expect(result.current.focused).toBeTruthy()

    await act(() => {
      child2.focus()
    })
    expect(result.current.focused).toBeTruthy()

    await act(() => {
      child.focus()
    })
    expect(result.current.focused).toBeTruthy()

    await act(() => {
      child.blur()
    })
    expect(result.current.focused).toBeFalsy()
  })

  it('should the state of target always be falsy when document.activeElement invalid', async () => {
    const mockWindow = new Proxy(window, {
      get: (target, prop: any) => {
        if (prop === 'document')
          return { ...document, activeElement: null }

        return window[prop]
      },
    })
    const { result, act } = await renderHook(() => useFocusWithin({ current: parent }, { window: mockWindow }))

    expect(result.current.focused).toBeFalsy()

    await act(() => {
      parent.focus()
    })
    expect(result.current.focused).toBeFalsy()

    await act(() => {
      child.focus()
    })
    expect(result.current.focused).toBeFalsy()
  })

  it('should support the ref form ({ current })', async () => {
    const elementRef = { current: parent }
    const { result, act } = await renderHook(() => useFocusWithin(elementRef))

    expect(result.current.focused).toBeFalsy()

    await act(() => {
      parent.focus()
    })
    expect(result.current.focused).toBeTruthy()

    await act(() => {
      parent.blur()
    })
    expect(result.current.focused).toBeFalsy()
  })

  it('should start tracking once a null ref is populated after the first render', async () => {
    const elementRef = { current: null as HTMLFormElement | null }
    const { result, rerender, act } = await renderHook(() => useFocusWithin(elementRef))

    // null on the first render — no listeners attach yet
    expect(result.current.focused).toBeFalsy()

    await act(() => {
      elementRef.current = parent
    })
    await rerender()
    // the binding effect re-ran and attached the listeners to the element

    await act(() => {
      parent.focus()
    })
    expect(result.current.focused).toBeTruthy()

    await act(() => {
      parent.blur()
    })
    expect(result.current.focused).toBeFalsy()
  })

  it('should remove the listeners on unmount', async () => {
    const removeSpy = vi.spyOn(parent, 'removeEventListener')
    const { unmount } = await renderHook(() => useFocusWithin({ current: parent }))

    await unmount()

    expect(removeSpy).toHaveBeenCalledWith('focusin', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('focusout', expect.any(Function))
  })

  it('should not leak stale listeners when the window option turns invalid', async () => {
    const invalidWindow = new Proxy(window, {
      get: (target, prop: any) => {
        if (prop === 'document')
          return { ...document, activeElement: null }

        return window[prop]
      },
    })
    const { result, act, rerender } = await renderHook(
      (props?: { win?: typeof window }) => useFocusWithin({ current: parent }, { window: props?.win }),
    )

    // valid window: listeners attach and focus is tracked
    await act(() => {
      parent.focus()
    })
    expect(result.current.focused).toBeTruthy()

    // window flips to an invalid document — listeners must be torn down
    await rerender({ win: invalidWindow as any })
    expect(result.current.focused).toBeFalsy()

    // no listeners remain, so a focus event can no longer flip state back
    await act(() => {
      parent.focus()
    })
    expect(result.current.focused).toBeFalsy()
  })
})
