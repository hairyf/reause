import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useFocusTrap } from '../useFocusTrap'

describe('useFocusTrap', () => {
  let container: HTMLDivElement
  let firstInput: HTMLInputElement
  let secondInput: HTMLInputElement
  let outsideButton: HTMLButtonElement

  beforeEach(() => {
    container = document.createElement('div')
    container.tabIndex = -1
    document.body.appendChild(container)

    firstInput = document.createElement('input')
    firstInput.tabIndex = 0
    container.appendChild(firstInput)

    secondInput = document.createElement('input')
    secondInput.tabIndex = 0
    container.appendChild(secondInput)

    outsideButton = document.createElement('button')
    document.body.appendChild(outsideButton)
  })

  afterEach(() => {
    container.remove()
    outsideButton.remove()
  })

  it('should be defined', () => {
    expect(useFocusTrap).toBeDefined()
  })

  it('should initialize with hasFocus and isPaused false', async () => {
    const { result } = await renderHook(() => useFocusTrap({ current: container }))

    expect(result.current.hasFocus).toBe(false)
    expect(result.current.isPaused).toBe(false)
  })

  it('should activate the trap and keep focus inside the element', async () => {
    const { result, act } = await renderHook(() => useFocusTrap({ current: container }))

    await act(async () => {
      result.current.activate()
      // focus-trap's `delayInitialFocus` moves the initial focus on the next tick
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.hasFocus).toBe(true)
    expect(document.activeElement).toBe(firstInput)
    expect(container.contains(document.activeElement)).toBe(true)

    // a focus attempt on an element outside the trap is pulled back in
    await act(() => {
      outsideButton.focus()
    })
    expect(container.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).not.toBe(outsideButton)
  })

  it('should accept a ref-like target ({ current })', async () => {
    const { result, act } = await renderHook(() => useFocusTrap({ current: container }))

    expect(result.current.hasFocus).toBe(false)

    await act(() => {
      result.current.activate()
    })

    expect(result.current.hasFocus).toBe(true)
  })

  it('should accept a selector string target', async () => {
    container.id = 'focus-trap-test-target'
    const { result, act } = await renderHook(() => useFocusTrap('#focus-trap-test-target'))

    await act(() => {
      result.current.activate()
    })

    expect(result.current.hasFocus).toBe(true)
  })

  it('should deactivate the trap and release focus', async () => {
    const { result, act } = await renderHook(() => useFocusTrap({ current: container }))

    await act(() => {
      result.current.activate()
    })
    expect(result.current.hasFocus).toBe(true)

    await act(() => {
      result.current.deactivate()
    })
    expect(result.current.hasFocus).toBe(false)

    // focus can leave the (deactivated) trap again
    await act(() => {
      outsideButton.focus()
    })
    expect(document.activeElement).toBe(outsideButton)
  })

  it('should pause and unpause the trap', async () => {
    const { result, act } = await renderHook(() => useFocusTrap({ current: container }))

    expect(result.current.isPaused).toBe(false)

    await act(() => {
      result.current.activate()
    })

    await act(() => {
      result.current.pause()
    })
    expect(result.current.isPaused).toBe(true)

    // while paused, focus is not trapped anymore
    await act(() => {
      outsideButton.focus()
    })
    expect(document.activeElement).toBe(outsideButton)

    await act(() => {
      result.current.unpause()
    })
    expect(result.current.isPaused).toBe(false)
  })

  it('should activate the trap on mount when immediate is set to true', async () => {
    const { result, act } = await renderHook(() => useFocusTrap({ current: container }, { immediate: true }))

    expect(result.current.hasFocus).toBe(true)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    expect(container.contains(document.activeElement)).toBe(true)
  })

  it('should deactivate the trap on unmount', async () => {
    const onDeactivate = vi.fn()
    const { result, act, unmount } = await renderHook(() => useFocusTrap({ current: container }, { onDeactivate }))

    await act(() => {
      result.current.activate()
    })
    expect(onDeactivate).not.toHaveBeenCalled()

    unmount()

    expect(onDeactivate).toHaveBeenCalledOnce()
  })

  it('should invoke user-provided onActivate and onDeactivate callbacks', async () => {
    const onActivate = vi.fn()
    const onDeactivate = vi.fn()
    const { result, act } = await renderHook(() => useFocusTrap({ current: container }, { onActivate, onDeactivate }))

    await act(() => {
      result.current.activate()
    })
    expect(onActivate).toHaveBeenCalledOnce()

    await act(() => {
      result.current.deactivate()
    })
    expect(onDeactivate).toHaveBeenCalledOnce()
  })
})
