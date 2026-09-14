import { describe, expect, it, vi } from 'vitest'
import { renderHook } from 'vitest-browser-react'
import { useControllableState } from '../useControllableState'

describe('useControllableState', () => {
  it('supports getter sources and passive local state', async () => {
    const source = 1
    const { result, act } = await renderHook(() => useControllableState(() => source, { passive: true }))
    expect(result.current[0]).toBe(1)
    await act(async () => result.current[1](value => value + 1))
    expect(result.current[0]).toBe(2)
    // the getter source has no write path — the update stays local
    expect(source).toBe(1)
  })

  it('writes through tuple state', async () => {
    const setState = vi.fn()
    const { result, act } = await renderHook(() => useControllableState<number>([1, setState] as const))
    await act(async () => result.current[1](2))
    expect(setState).toHaveBeenCalledWith(2)
    expect(result.current[0]).toBe(1)
  })

  it('writes through value/onChange state', async () => {
    const onChange = vi.fn()
    const state = { value: 'a', onChange }
    const { result, act } = await renderHook(() => useControllableState(state))
    await act(async () => result.current[1]('b'))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('uses defaultValue and lazy getters', async () => {
    const { result } = await renderHook(() => useControllableState(() => 'computed', { defaultValue: 'fallback' }))
    expect(result.current[0]).toBe('computed')
  })

  it('honors shouldUpdate as a commit predicate', async () => {
    const shouldUpdate = (prev: number, next: number) => next > prev
    const { result, act } = await renderHook(() => useControllableState<number>(1, { passive: true, shouldUpdate }))
    await act(async () => result.current[1](0))
    expect(result.current[0]).toBe(1)
    await act(async () => result.current[1](2))
    expect(result.current[0]).toBe(2)
  })

  it('treats a plain-value source with passive: false as controlled (external wins)', async () => {
    const { result, rerender } = await renderHook(
      ({ source }: { source: string } = { source: 'a' }) => useControllableState(source),
      { initialProps: { source: 'a' } },
    )
    expect(result.current[0]).toBe('a')
    await rerender({ source: 'b' })
    expect(result.current[0]).toBe('b')
  })

  it('warns instead of silently discarding setValue on a controlled plain-value source', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { result, act } = await renderHook(() => useControllableState('a'))
      await act(async () => result.current[1]('b'))
      // the write has no channel back to the caller — a no-op, but loudly surfaced
      expect(warn).toHaveBeenCalled()
    }
    finally {
      warn.mockRestore()
    }
  })

  it('passive sync honors shouldUpdate', async () => {
    const shouldUpdate = (prev: number, next: number) => next > prev
    const { result, rerender } = await renderHook(
      ({ source }: { source: number } = { source: 3 }) => useControllableState(source, { passive: true, shouldUpdate }),
      { initialProps: { source: 3 } },
    )
    expect(result.current[0]).toBe(3)
    // the external value drops below the internal one — rejected by shouldUpdate
    await rerender({ source: 1 })
    expect(result.current[0]).toBe(3)
    await rerender({ source: 5 })
    expect(result.current[0]).toBe(5)
  })
})
