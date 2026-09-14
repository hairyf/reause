import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useMagicKeys } from '../useMagicKeys'

interface DispatchKeyboardEventOptions extends Partial<KeyboardEvent> {
  key: string
  target?: HTMLElement
  eventType?: 'keydown' | 'keyup'
}

/**
 * Dispatch keyboard event — mirror of the upstream test helper
 * (`source/vueuse/packages/.test/keyboardEvent.ts`).
 */
function dispatchKeyboardEvent(options: DispatchKeyboardEventOptions): void {
  const { eventType = 'keydown', target = document, key, ...args } = options
  target.dispatchEvent(new KeyboardEvent(eventType, { key, ...args }))
}

describe('useMagicKeys', () => {
  let target: HTMLInputElement
  let targetRef: { current: HTMLInputElement | null }

  beforeEach(() => {
    target = document.createElement('input')
    targetRef = { current: target }
  })

  it('single key', async () => {
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))
    expect(result.current.A).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'A' })
    })
    expect(result.current.A).toBe(true)
  })

  it('multiple keys', async () => {
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))
    expect(result.current.Ctrl_Shift_Period).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'control', ctrlKey: true })
    })
    expect(result.current.Ctrl_Shift_Period).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'shift', ctrlKey: true, shiftKey: true })
    })
    expect(result.current.Ctrl_Shift_Period).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'Period', ctrlKey: true, shiftKey: true })
    })
    expect(result.current.Ctrl_Shift_Period).toBe(true)
  })

  it('multiple keys(for MacOS meta won\'t trigger keyup)', async () => {
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))
    expect(result.current.command).toBe(false)
    expect(result.current.a).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'a' })
    })
    expect(result.current.a).toBe(true)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'Meta', metaKey: true })
    })
    expect(result.current.command).toBe(true)

    await act(() => {
      dispatchKeyboardEvent({ target, eventType: 'keyup', key: 'Meta', metaKey: true })
    })
    expect(result.current.command).toBe(false)
    expect(result.current.a).toBe(false)

    // #977
    // After solving the release Command, repeatedly pressing the Command will trigger repeatedly
    await act(() => {
      dispatchKeyboardEvent({ target, key: 'Meta', metaKey: true })
    })
    expect(result.current.command).toBe(true)
    expect(result.current.a).toBe(false)
  })

  it('multiple keys(in a different order)', async () => {
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))
    expect(result.current.Ctrl_Shift_Period).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'shift', shiftKey: true })
    })
    expect(result.current.Ctrl_Shift_Period).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'control', shiftKey: true, ctrlKey: true })
    })
    expect(result.current.Ctrl_Shift_Period).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'Period', shiftKey: true, ctrlKey: true })
    })
    expect(result.current.Ctrl_Shift_Period).toBe(true)
  })

  it('prevent incorrect clearing of other keys after releasing shift', async () => {
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))
    const { v, u, e, shift } = result.current
    expect([v, u, e, shift].every(val => val === false)).toBe(true)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'v' })
      dispatchKeyboardEvent({ target, key: 'u' })
      dispatchKeyboardEvent({ target, key: 'shift', shiftKey: true })
      dispatchKeyboardEvent({ target, key: 'e', shiftKey: true })
    })

    expect(result.current.v).toBe(true)
    expect(result.current.u).toBe(true)
    expect(result.current.shift).toBe(true)
    expect(result.current.e).toBe(true)

    // Clear key pressed after shift
    await act(() => {
      dispatchKeyboardEvent({ target, eventType: 'keyup', key: 'shift', shiftKey: true })
    })
    expect(result.current.v).toBe(true)
    expect(result.current.u).toBe(true)
    expect(result.current.e).toBe(false)
    expect(result.current.shift).toBe(false)
  })

  it('prevent incorrect clearing of other keys after releasing alt', async () => {
    // #5035
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'v' })
      dispatchKeyboardEvent({ target, key: 'Alt', altKey: true })
      dispatchKeyboardEvent({ target, key: 'u', altKey: true })
      dispatchKeyboardEvent({ target, key: 'e', altKey: true })
    })
    expect(result.current.current).toStrictEqual(new Set(['v', 'alt', 'u', 'e']))

    // Clear key pressed after alt
    await act(() => {
      dispatchKeyboardEvent({ target, key: 'Alt', altKey: true, eventType: 'keyup' })
    })
    expect(result.current.current).toStrictEqual(new Set(['v']))
  })

  it('current return value', async () => {
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))
    expect(result.current.v).toBe(false)
    await act(() => {
      dispatchKeyboardEvent({ target, key: 'v' })
    })

    expect(result.current.v).toBe(true)
    expect(result.current.current.has('v')).toBe(true)
  })

  it('alias map option', async () => {
    const { act, result } = await renderHook(() => useMagicKeys({ aliasMap: { ct: 'control' }, target: targetRef }))
    expect(result.current.ct).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'Control', ctrlKey: true })
    })
    expect(result.current.ct).toBe(true)
  })

  it('reactive option: plain booleans in both modes', async () => {
    // `reactive` is accepted for API compatibility only — React state is
    // always reactive, so both modes return plain boolean values
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef, reactive: true }))
    expect(result.current.a).toBeTypeOf('boolean')

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'a' })
    })
    expect(result.current.a).toBe(true)
    expect(result.current.current.has('a')).toBe(true)

    const { result: defaultResult } = await renderHook(() => useMagicKeys({ target: targetRef }))
    expect(defaultResult.current.a).toBeTypeOf('boolean')
  })

  it('tracks a key pressed before it was first read (eager tracking)', async () => {
    // divergence from upstream's lazy per-key refs: presses are recorded
    // eagerly, so reading a key afterwards reports the truth
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'x' })
    })

    expect(result.current.x).toBe(true)
  })

  it('target blur', async () => {
    // #1350
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))
    expect(result.current.alt_tab).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'Alt', altKey: true })
      dispatchKeyboardEvent({ target, key: 'Tab', altKey: true })
    })
    expect(result.current.alt_tab).toBe(true)

    await act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(result.current.alt_tab).toBe(false)
  })

  it('target focus', async () => {
    // #1350
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))
    expect(result.current.alt_tab).toBe(false)

    await act(() => {
      dispatchKeyboardEvent({ target, key: 'Alt', altKey: true })
      dispatchKeyboardEvent({ target, key: 'Tab', altKey: true })
    })
    expect(result.current.alt_tab).toBe(true)

    await act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(result.current.alt_tab).toBe(false)
  })

  it('should handle empty or undefined key events without errors', async () => {
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))

    // Test empty key
    await act(() => {
      target.dispatchEvent(new KeyboardEvent('keyup', {}))
    })

    // Test empty string key
    await act(() => {
      target.dispatchEvent(new KeyboardEvent('keyup', { key: '' }))
    })

    expect(result.current.a).toBe(false)
  })

  it('should be robust when key is explicitly undefined', async () => {
    const { act, result } = await renderHook(() => useMagicKeys({ target: targetRef }))

    const event = new KeyboardEvent('keyup', {})
    Object.defineProperty(event, 'key', { value: undefined })

    await act(() => {
      target.dispatchEvent(event)
    })

    expect(result.current.a).toBe(false)
  })
})
