import type { Dispatch, SetStateAction } from 'react'
import type { UseFocusReturn } from '../useFocus'
import { beforeEach, describe, expect, expectTypeOf, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { useFocus } from '../useFocus'

describe('useFocus', () => {
  let target: HTMLButtonElement

  beforeEach(() => {
    document.body.innerHTML = ''
    target = document.createElement('button')
    target.tabIndex = 0
    document.body.appendChild(target)
  })

  it('should be defined', () => {
    expect(useFocus).toBeDefined()
  })

  it('should initialize properly', async () => {
    const { result } = await renderHook(() => useFocus({ current: target }))

    expect(result.current[0]).toBeFalsy()
  })

  it('reflects focus/blur events in element 0 of the tuple', async () => {
    const { result, act } = await renderHook(() => useFocus({ current: target }))

    expect(result.current[0]).toBeFalsy()

    await act(() => {
      target?.focus()
    })
    expect(result.current[0]).toBeTruthy()

    await act(() => {
      target?.blur()
    })
    expect(result.current[0]).toBeFalsy()
  })

  it('setFocused(true) focuses the target and setFocused(false) blurs it', async () => {
    const { result, act } = await renderHook(() => useFocus({ current: target }))

    expect(document.activeElement).not.toBe(target)

    await act(() => {
      result.current[1](true)
    })
    expect(document.activeElement).toBe(target)
    expect(result.current[0]).toBeTruthy()

    await act(() => {
      result.current[1](false)
    })
    expect(document.activeElement).not.toBe(target)
    expect(result.current[0]).toBeFalsy()
  })

  it('setFocused accepts a functional updater', async () => {
    const { result, act } = await renderHook(() => useFocus({ current: target }))

    await act(() => {
      result.current[1](prev => !prev)
    })
    expect(document.activeElement).toBe(target)
    expect(result.current[0]).toBeTruthy()

    await act(() => {
      result.current[1](prev => !prev)
    })
    expect(document.activeElement).not.toBe(target)
    expect(result.current[0]).toBeFalsy()
  })

  it('should only focus when :focus-visible matches with focusVisible=true', async () => {
    const { result, act } = await renderHook(() => useFocus({ current: target }, { focusVisible: true }))

    await act(async () => {
      await userEvent.tab()
    })
    expect(result.current[0]).toBeTruthy()

    await act(async () => {
      await userEvent.tab()
    })
    expect(result.current[0]).toBeFalsy()

    // upstream reuses the `target` variable here, but the renderHook callback
    // re-reads its closure on every re-render — reassigning `target` would
    // move the hook onto the new element. Keep the new element in its own
    // variable so the hook keeps tracking the original target.
    const extra = document.createElement('button')
    extra.tabIndex = 0
    document.body.appendChild(extra)

    await act(async () => {
      await userEvent.tab()
    })
    await act(async () => {
      await userEvent.tab()
    })

    expect(result.current[0]).toBeFalsy()
  })

  describe('when target is missing', () => {
    it('should initialize properly', async () => {
      const { result } = await renderHook(() => useFocus({ current: null }))

      expect(result.current[0]).toBeFalsy()
    })
  })

  describe('when initialValue=true passed in', () => {
    it('should initialize focus', async () => {
      const { result } = await renderHook(() => useFocus({ current: target }, { initialValue: true }))

      expect(document.activeElement).toBe(target)
      expect(result.current[0]).toBeTruthy()
    })
  })

  it('supports SVG elements as the target', async () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('tabindex', '0')
    document.body.appendChild(svg)

    const { result, act } = await renderHook(() => useFocus({ current: svg as unknown as SVGElement }))

    expect(result.current[0]).toBeFalsy()

    await act(() => {
      svg.focus()
    })
    expect(result.current[0]).toBeTruthy()

    await act(() => {
      svg.blur()
    })
    expect(result.current[0]).toBeFalsy()
  })

  it('returns a React tuple [isFocused, setFocused]', async () => {
    const { result } = await renderHook(() => useFocus({ current: target }))

    expectTypeOf(result.current).toEqualTypeOf<UseFocusReturn>()
    expectTypeOf(result.current).toEqualTypeOf<
      readonly [boolean, Dispatch<SetStateAction<boolean>>]
    >()
    expectTypeOf(result.current[0]).toEqualTypeOf<boolean>()
    expectTypeOf(result.current[1]).toEqualTypeOf<Dispatch<SetStateAction<boolean>>>()

    expect(Array.isArray(result.current)).toBe(true)
    expect(result.current).toHaveLength(2)
    expect(result.current[0]).toBe(false)
    expect(result.current[1]).toBeTypeOf('function')
  })
})
