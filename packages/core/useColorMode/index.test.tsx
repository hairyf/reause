import type { RefObject } from 'react'
import type { BasicColorSchema } from '../useColorMode'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useColorMode } from '../useColorMode'

const storageKey = 'vueuse-color-scheme'
const htmlEl = document.querySelector('html')!

// deterministic system preference, mirroring the upstream test's mocked
// `usePreferredDark` ref — flipped by the tests, then re-render triggers the
// hook to recompute (upstream's `mockPreferredDark.value = ...`)
const mockPrefDark = vi.hoisted(() => ({ current: false }))

vi.mock('../usePreferredDark', () => ({
  usePreferredDark: () => mockPrefDark.current,
}))

describe('useColorMode', () => {
  beforeEach(() => {
    mockPrefDark.current = false
    localStorage.clear()
    htmlEl.className = ''
  })

  afterEach(() => {
    htmlEl.className = ''
  })

  it('should translate auto mode when prefer dark', async () => {
    const { result, act, rerender } = await renderHook(() => useColorMode())

    await act(() => {
      result.current[1]('auto')
    })
    mockPrefDark.current = true
    await act(() => rerender())

    expect(result.current[0]).toBe('dark')
    expect(localStorage.getItem(storageKey)).toBe('auto')
    expect(htmlEl.className).toMatch(/dark/)
  })

  it('should translate auto mode', async () => {
    const { result, act } = await renderHook(() => useColorMode())

    await act(() => {
      result.current[1]('auto')
    })

    expect(result.current[0]).toBe('light')
    expect(localStorage.getItem(storageKey)).toBe('auto')
    expect(htmlEl.className).toMatch(/light/)
  })

  it('should translate custom mode', async () => {
    const { result, act } = await renderHook(() =>
      useColorMode<'custom' | 'unknown'>({ modes: { custom: 'custom' } }))

    await act(() => {
      result.current[1]('custom')
    })
    expect(result.current[0]).toBe('custom')
    expect(localStorage.getItem(storageKey)).toBe('custom')
    expect(htmlEl.className).toMatch(/custom/)

    await act(() => {
      result.current[1]('unknown')
    })
    expect(result.current[0]).toBe('unknown')
    expect(localStorage.getItem(storageKey)).toBe('unknown')
    expect(htmlEl.className).toBe('')
  })

  it('should include auto mode', async () => {
    const { result, act } = await renderHook(() => useColorMode({ emitAuto: true }))

    await act(() => {
      result.current[1]('auto')
    })
    expect(result.current[0]).toBe('auto')
    expect(localStorage.getItem(storageKey)).toBe('auto')
    expect(htmlEl.className).toMatch(/light/)
  })

  it('should not persist mode into localStorage', async () => {
    const { result, act } = await renderHook(() => useColorMode({ storageKey: null }))

    await act(() => {
      result.current[1]('auto')
    })
    expect(result.current[0]).toBe('light')
    expect(localStorage.getItem(storageKey)).toBeNull()
    expect(htmlEl.className).toMatch(/light/)
  })

  it('should set html attribute to be mode', async () => {
    const { result, act } = await renderHook(() => useColorMode({ attribute: 'data-color-mode' }))

    await act(() => {
      result.current[1]('auto')
    })
    expect(result.current[0]).toBe('light')
    expect(localStorage.getItem(storageKey)).toBe('auto')
    expect(htmlEl.getAttribute('data-color-mode')).toBe('light')
  })

  it('should not affect html when selector invalid', async () => {
    const { result, act } = await renderHook(() => useColorMode({ selector: 'unknown' }))

    await act(() => {
      result.current[1]('auto')
    })
    expect(result.current[0]).toBe('light')
    expect(localStorage.getItem(storageKey)).toBe('auto')
    expect(htmlEl.className).toBe('')
  })

  it('should call onChanged when mode changed', async () => {
    let nextMode: any = null
    const onChanged = (mode: any, defaultOnChanged: any) => {
      nextMode = mode
      defaultOnChanged(mode)
    }
    const { result, act } = await renderHook(() => useColorMode({ onChanged }))

    await act(() => {
      result.current[1]('auto')
    })
    expect(result.current[0]).toBe('light')
    expect(nextMode).toBe('light')
    expect(localStorage.getItem(storageKey)).toBe('auto')
    expect(htmlEl.className).toMatch(/light/)
  })

  it('should only change html class when preferred dark changed', async () => {
    const { result, act, rerender } = await renderHook(() => useColorMode({ emitAuto: true }))

    mockPrefDark.current = true
    await act(() => rerender())

    expect(result.current[0]).toBe('auto')
    expect(localStorage.getItem(storageKey)).toBe('auto')
    expect(htmlEl.className).toMatch(/dark/)
  })

  it('should keep raw auto in storage while exposing translated mode', async () => {
    const { result, act, rerender } = await renderHook(() => useColorMode())

    // the store (persisted) keeps 'auto'...
    expect(localStorage.getItem(storageKey)).toBe('auto')
    // ...while the exposed mode is translated from the system preference
    expect(result.current[0]).toBe('light')

    mockPrefDark.current = true
    await act(() => rerender())
    expect(result.current[0]).toBe('dark')
  })

  it('should skip the persistence layer when storageRef is provided', async () => {
    const storageRef: RefObject<BasicColorSchema> = { current: 'dark' }
    const addEventListener = vi.spyOn(window, 'addEventListener')

    const { result, act } = await renderHook(() => useColorMode({ storageRef }))

    // no `writeDefaults` write of the default 'auto' on mount
    expect(localStorage.getItem(storageKey)).toBeNull()
    // no storage-event listener subscribed
    const eventTypes = addEventListener.mock.calls.map(([type]) => type)
    expect(eventTypes).not.toContain('storage')
    expect(eventTypes).not.toContain('reause-storage')
    expect(result.current[0]).toBe('dark')

    await act(() => {
      result.current[1]('light')
    })
    expect(storageRef.current).toBe('light')
    expect(result.current[0]).toBe('light')
    expect(localStorage.getItem(storageKey)).toBeNull()

    addEventListener.mockRestore()
  })

  it('should fall back to initialValue when storageRef.current is null', async () => {
    // `RefObject` types `current` as non-nullable, but a runtime `null` is
    // possible — the hook guards it instead of exposing `null` (upstream
    // passes the raw `store.value` through)
    const storageRef = { current: null } as unknown as RefObject<BasicColorSchema>

    const { result } = await renderHook(() => useColorMode({ storageRef, initialValue: 'dark' }))

    expect(result.current[0]).toBe('dark')
  })

  it('should call classList.add/classList.remove only if mode changed', async () => {
    const target = document.createElement('div')

    const { result, act } = await renderHook(() => useColorMode({ selector: { current: target }, initialValue: 'light' }))

    const addClass = vi.spyOn(target.classList, 'add')
    const removeClass = vi.spyOn(target.classList, 'remove')

    await act(() => {
      result.current[1]('light')
    })
    expect(addClass).not.toHaveBeenCalled()
    expect(removeClass).not.toHaveBeenCalled()

    await act(() => {
      result.current[1]('dark')
    })
    expect(addClass).toHaveBeenCalled()
    expect(removeClass).toHaveBeenCalled()
  })

  it('should call setAttribute only if mode changed', async () => {
    const target = document.createElement('div')

    const { result, act } = await renderHook(() => useColorMode({ selector: { current: target }, initialValue: 'light', attribute: 'data-color-mode' }))

    const setAttr = vi.spyOn(target, 'setAttribute')

    await act(() => {
      result.current[1]('light')
    })
    expect(setAttr).not.toHaveBeenCalled()

    await act(() => {
      result.current[1]('dark')
    })
    expect(setAttr).toHaveBeenCalled()
  })
})
